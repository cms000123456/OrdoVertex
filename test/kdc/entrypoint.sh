#!/bin/sh
set -e

REALM="${KRB5_REALM:-ORDOVERTEX.TEST}"
DOMAIN="${SMB_DOMAIN:-ORDOVERTEX}"
ADMINPASS="${ADMIN_PASSWORD:-Admin1234!}"
TESTUSER="${TEST_USER:-testuser}"
TESTPASS="${TEST_PASSWORD:-testpassword}"
KEYTAB_DIR="/keytabs"

mkdir -p "$KEYTAB_DIR" /samba/dc-share
chmod 777 /samba/dc-share

# Create a local Unix user for the force user mapping in smb.conf
id "$TESTUSER" >/dev/null 2>&1 || adduser -D -H -G nobody "$TESTUSER" 2>/dev/null || true

if [ ! -f /var/lib/samba/private/secrets.tdb ]; then
  echo "Provisioning Samba AD DC for realm $REALM..."
  # Remove the default standalone smb.conf — provision generates its own
  rm -f /etc/samba/smb.conf
  samba-tool domain provision \
    --realm="$REALM" \
    --domain="$DOMAIN" \
    --adminpass="$ADMINPASS" \
    --server-role=dc \
    --dns-backend=SAMBA_INTERNAL \
    --option="dns forwarder = 1.1.1.1" 2>&1 | grep -Ev "^$|^Setting up" || true

  # Add the test share — use force user = root so any authenticated AD user
  # can write; the path is chmod 777 so no permission issues
  cat >> /etc/samba/smb.conf << EOF

[dc-testshare]
  path = /samba/dc-share
  browsable = yes
  read only = no
  guest ok = no
  force user = root
  create mask = 0777
  force create mode = 0777
EOF
fi

# Clean up stale PID files so samba starts cleanly after container restart
rm -f /run/samba/samba.pid /run/samba/smbd.pid /var/run/samba/samba.pid /var/run/samba/smbd.pid

# Start Samba DC (daemonizes itself; worker processes persist)
samba --no-process-group

# Wait for Samba LDAP to accept connections (check port 389 is listening)
echo "Waiting for Samba LDAP..."
LDAP_READY=0
for i in $(seq 1 150); do
  # Port 389 in hex is 0185; check if it is bound in /proc/net/tcp or tcp6
  if grep -q ':0185 ' /proc/net/tcp /proc/net/tcp6 2>/dev/null; then
    echo "LDAP ready after $((i * 2))s"
    LDAP_READY=1
    break
  fi
  sleep 2
done

if [ "$LDAP_READY" = "0" ]; then
  echo "ERROR: Samba LDAP did not become ready — check capabilities" >&2
  exit 1
fi

# Relax password policy so testpassword works
samba-tool domain passwordsettings set --complexity=off --min-pwd-length=6 2>/dev/null || true

# Create test user (idempotent)
samba-tool user show "$TESTUSER" >/dev/null 2>&1 || \
  samba-tool user create "$TESTUSER" "$TESTPASS" --use-username-as-cn 2>&1 || true

# Export testuser's long-term keys as a keytab for kinit
samba-tool domain exportkeytab "$KEYTAB_DIR/testuser.keytab" \
  --principal="${TESTUSER}@${REALM}" 2>/dev/null || \
samba-tool domain exportkeytab "$KEYTAB_DIR/testuser.keytab" 2>/dev/null || true

# Write krb5.conf for other containers
cat > "$KEYTAB_DIR/krb5.conf" << CONF
[libdefaults]
    default_realm = $REALM
    dns_lookup_realm = false
    dns_lookup_kdc = false
    forwardable = true

[realms]
    $REALM = {
        kdc = samba-dc:88
        admin_server = samba-dc:749
    }
CONF

chmod 644 "$KEYTAB_DIR/krb5.conf"
[ -f "$KEYTAB_DIR/testuser.keytab" ] && chmod 644 "$KEYTAB_DIR/testuser.keytab"

touch "$KEYTAB_DIR/ready"
echo "Samba DC ready — realm $REALM, share //samba-dc/dc-testshare"

# Keep container alive; samba daemon processes run independently
exec tail -f /dev/null
