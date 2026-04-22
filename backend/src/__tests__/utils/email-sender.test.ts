import { sendEmail } from '../../utils/email-sender';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  }),
}));

describe('sendEmail', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return early when SMTP is not configured', async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    const { default: nodemailer } = await import('nodemailer');
    await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      text: 'Hello'
    });

    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it('should send email when SMTP is configured', async () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'user@example.com';
    process.env.SMTP_PASS = 'password123';
    process.env.FROM_EMAIL = 'sender@example.com';

    const { default: nodemailer } = await import('nodemailer');
    await sendEmail({
      to: 'recipient@example.com',
      subject: 'Test Subject',
      text: 'Test body',
      html: '<p>Test body</p>'
    });

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: {
        user: 'user@example.com',
        pass: 'password123'
      }
    });

    const transporter = nodemailer.createTransport();
    expect(transporter.sendMail).toHaveBeenCalledWith({
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Test Subject',
      text: 'Test body',
      html: '<p>Test body</p>'
    });
  });

  it('should use default port 587 when SMTP_PORT is not set', async () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_USER = 'user@example.com';
    process.env.SMTP_PASS = 'password123';
    delete process.env.SMTP_PORT;

    const { default: nodemailer } = await import('nodemailer');
    await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      text: 'Hello'
    });

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ port: 587 })
    );
  });

  it('should use secure=true for port 465', async () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '465';
    process.env.SMTP_USER = 'user@example.com';
    process.env.SMTP_PASS = 'password123';

    const { default: nodemailer } = await import('nodemailer');
    await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      text: 'Hello'
    });

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ secure: true })
    );
  });
});
