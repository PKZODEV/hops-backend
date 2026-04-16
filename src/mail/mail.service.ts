import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private fromAddress: string;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = parseInt(this.config.get<string>('SMTP_PORT') ?? '587', 10);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    this.fromAddress = this.config.get<string>('SMTP_FROM') ?? 'no-reply@hops.local';

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`MailService configured (${host}:${port})`);
    } else {
      this.logger.warn('SMTP not configured — emails will be logged only.');
    }
  }

  async send(to: string, subject: string, html: string) {
    if (!this.transporter) {
      this.logger.log(`[MOCK MAIL] to=${to} subject="${subject}"\n${html}`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (e) {
      this.logger.error(`Failed to send email to ${to}`, e as Error);
    }
  }

  async sendApprovalEmail(args: {
    to: string;
    name: string;
    businessName: string;
    username: string;
    password: string;
  }) {
    const { to, name, businessName, username, password } = args;
    const subject = 'คำขอลงทะเบียน HOPS ของคุณได้รับการอนุมัติแล้ว';
    const html = `
      <div style="font-family:sans-serif;color:#1f2937;line-height:1.6;">
        <h2 style="color:#2FA6A8;">ยินดีต้อนรับเข้าสู่ HOPS</h2>
        <p>เรียน คุณ${name || businessName}</p>
        <p>คำขอลงทะเบียนของท่านในนาม <strong>${businessName}</strong> ได้รับการอนุมัติเรียบร้อยแล้ว</p>
        <p>ท่านสามารถเข้าสู่ระบบด้วยข้อมูลด้านล่างนี้:</p>
        <table style="border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:6px 12px;background:#F1F5F9;font-weight:bold;">Username</td><td style="padding:6px 12px;background:#F8FAFC;">${username}</td></tr>
          <tr><td style="padding:6px 12px;background:#F1F5F9;font-weight:bold;">Password</td><td style="padding:6px 12px;background:#F8FAFC;font-family:monospace;">${password}</td></tr>
        </table>
        <p style="color:#dc2626;"><strong>เพื่อความปลอดภัย</strong> เมื่อท่านเข้าสู่ระบบครั้งแรก ระบบจะให้ท่านเปลี่ยนรหัสผ่านทันที</p>
        <p>เข้าสู่ระบบได้ที่: <a href="http://119.59.116.75/login" style="color:#2FA6A8;">http://119.59.116.75/login</a></p>
        <p>ขอแสดงความนับถือ<br/>ทีมงาน HOPS</p>
      </div>
    `;
    await this.send(to, subject, html);
  }

  async sendOtpEmail(args: { to: string; code: string; refCode: string }) {
    const { to, code, refCode } = args;
    const subject = 'HOPS - รหัส OTP ยืนยันตัวตน';
    const html = `
      <div style="font-family:sans-serif;color:#1f2937;line-height:1.6;">
        <h2 style="color:#2FA6A8;">HOPS - ยืนยันตัวตน</h2>
        <p>รหัส OTP ของคุณคือ:</p>
        <div style="text-align:center;margin:24px 0;">
          <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#2FA6A8;background:#F1F5F9;padding:16px 24px;border-radius:12px;">${code}</span>
        </div>
        <p>รหัสอ้างอิง (Ref): <strong>${refCode}</strong></p>
        <p style="color:#6b7280;">รหัสนี้จะหมดอายุภายใน 10 นาที</p>
        <p>หากคุณไม่ได้ทำรายการนี้ กรุณาเพิกเฉยอีเมลนี้</p>
        <p>ขอแสดงความนับถือ<br/>ทีมงาน HOPS</p>
      </div>
    `;
    await this.send(to, subject, html);
  }

  async sendRejectionEmail(args: { to: string; name: string; reason?: string }) {
    const { to, name, reason } = args;
    const subject = 'คำขอลงทะเบียน HOPS ของคุณ';
    const html = `
      <div style="font-family:sans-serif;color:#1f2937;line-height:1.6;">
        <h2 style="color:#dc2626;">คำขอลงทะเบียนไม่ผ่านการพิจารณา</h2>
        <p>เรียน คุณ${name}</p>
        <p>ขออภัย คำขอลงทะเบียนของท่านในระบบ HOPS ไม่ผ่านการพิจารณาในขณะนี้</p>
        ${reason ? `<p><strong>เหตุผล:</strong> ${reason}</p>` : ''}
        <p>ท่านสามารถติดต่อทีมงานเพื่อสอบถามรายละเอียดเพิ่มเติมได้</p>
        <p>ขอแสดงความนับถือ<br/>ทีมงาน HOPS</p>
      </div>
    `;
    await this.send(to, subject, html);
  }
}
