FROM alpine:3.19
RUN apk add --no-cache samba-dc samba-common-tools krb5 bind-tools
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
