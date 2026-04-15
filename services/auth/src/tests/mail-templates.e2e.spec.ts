import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { Role } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import * as path from 'path';
import * as fs from 'fs/promises';
import Handlebars from 'handlebars';

/**
 * Mail Templates E2E Test
 * Envía TODOS los emails (excepto test.hbs) con datos reales.
 * Objetivo: Validar que todas las plantillas se renderizan correctamente
 * y que los envíos llegarían a un servidor SMTP real (ej: Mailpit en dev)
 */

describe('Email Templates - Complete Send Test', () => {
  const templatesDir = path.join(__dirname, '../shared/mail/templates');
  let transporter: nodemailer.Transporter;
  const testEmails: string[] = [];

  beforeEach(async () => {
    // Configurar transporter con Mailpit (SMTP mock en desarrollo)
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'mailpit',
      port: parseInt(process.env.SMTP_PORT || '1025'),
      secure: false, // true for 465, false for other ports
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
    });

    // Limpiar emails de test
    testEmails.length = 0;
  });

  afterEach(async () => {
    if (transporter) {
      transporter.close();
    }
  });

  const renderTemplate = async (templateName: string, data: any): Promise<string> => {
    const templatePath = path.join(templatesDir, `${templateName}.hbs`);
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    const template = Handlebars.compile(templateContent);
    return template(data);
  };

  /**
   * 1. WELCOME EMAIL
   * Enviado cuando usuario se registra (PENDING state)
   */
  it('SEND: Welcome Email (on user registration - PENDING)', async () => {
    const email = 'welcome-test@test.test';
    testEmails.push(email);

    const html = await renderTemplate('welcome', {});

    const result = await transporter.sendMail({
      from: process.env.MAIL_FROM || 'noreply@aurora.local',
      to: email,
      subject: '✉️ Bienvenido a AURORA Blockchain Identity System',
      html,
    });

    console.log('📧 Welcome Email sent:', result.messageId);
    expect(result.messageId).toBeTruthy();
    expect(html).toContain('AURORA');
  });

  /**
   * 2. VERIFY EMAIL
   * Enviado cuando admin aprueba al usuario (PENDING → ACTIVE)
   * Incluye link para establecer contraseña
   */
  it('SEND: Verify Email (on user approval - PENDING → ACTIVE)', async () => {
    const email = 'verify-test@test.test';
    testEmails.push(email);

    const actionUrl = 'https://app.aurora.local/auth/set-password?token=abc123def456';

    const html = await renderTemplate('verify', {
      email,
      action_url: actionUrl,
    });

    const result = await transporter.sendMail({
      from: process.env.MAIL_FROM || 'noreply@aurora.local',
      to: email,
      subject: '✅ Email Verificado - Estableça su Contraseña',
      html,
    });

    console.log('📧 Verify Email sent:', result.messageId);
    expect(result.messageId).toBeTruthy();
    expect(html).toContain(email);
    expect(html).toContain(actionUrl);
  });

  /**
   * 3. RECOVER EMAIL
   * Enviado cuando usuario solicita recuperación de contraseña
   * Incluye link pero NO incluye email por privacidad
   */
  it('SEND: Recover Email (on password reset request)', async () => {
    const email = 'recover-test@test.test';
    testEmails.push(email);

    const actionUrl = 'https://app.aurora.local/auth/reset-password?token=xyz789uvw123';

    const html = await renderTemplate('recover', {
      action_url: actionUrl,
    });

    const result = await transporter.sendMail({
      from: process.env.MAIL_FROM || 'noreply@aurora.local',
      to: email,
      subject: '🔒 Recuperación de Acceso - AURORA',
      html,
    });

    console.log('📧 Recover Email sent:', result.messageId);
    expect(result.messageId).toBeTruthy();
    expect(html).toContain(actionUrl);
    expect(html).not.toContain(email); // Privacy: no email in content
  });

  /**
   * 4. ROLE CHANGED EMAIL
   * Enviado cuando un admin cambia el rol de un usuario
   * Incluye rol anterior (si aplica) y nuevo rol
   */
  it('SEND: Role Changed Email (on admin role change)', async () => {
    const email = 'role-change-test@test.test';
    testEmails.push(email);

    const newRole = Role.ADMIN;
    const previousRole = Role.USER;

    const html = await renderTemplate('role-changed', {
      email,
      newRole,
      previousRole,
    });

    const result = await transporter.sendMail({
      from: process.env.MAIL_FROM || 'noreply@aurora.local',
      to: email,
      subject: '👤 Cambio de Rol - AURORA',
      html,
    });

    console.log('📧 Role Changed Email sent:', result.messageId);
    expect(result.messageId).toBeTruthy();
    expect(html).toContain(newRole);
    expect(html).toContain(previousRole);
  });

  /**
   * 5. ACCOUNT DELETED EMAIL
   * Enviado cuando una cuenta es revocada (soft delete)
   * Incluye timestamp de revocación
   */
  it('SEND: Account Deleted Email (on user revocation)', async () => {
    const email = 'deleted-test@test.test';
    testEmails.push(email);

    const revokedAt = new Date().toISOString();

    const html = await renderTemplate('account-deleted', {
      email,
      revokedAt,
    });

    const result = await transporter.sendMail({
      from: process.env.MAIL_FROM || 'noreply@aurora.local',
      to: email,
      subject: '⚠️ Cuenta Revocada - AURORA',
      html,
    });

    console.log('📧 Account Deleted Email sent:', result.messageId);
    expect(result.messageId).toBeTruthy();
    expect(html).toContain(revokedAt);
  });

  /**
   * BULK TEST: Send all templates in quick succession
   * Para validar que todas se renderizan sin errores
   */
  it('BULK: Send all templates at once (stress test)', async () => {
    const results = [];

    // Welcome
    const welcomeHtml = await renderTemplate('welcome', {});
    results.push(
      transporter.sendMail({
        from: process.env.MAIL_FROM || 'noreply@aurora.local',
        to: 'bulk-welcome@test.test',
        subject: 'Welcome',
        html: welcomeHtml,
      }),
    );

    // Verify
    const verifyHtml = await renderTemplate('verify', {
      email: 'bulk-verify@test.test',
      action_url: 'https://app.aurora.local/verify?token=test123',
    });
    results.push(
      transporter.sendMail({
        from: process.env.MAIL_FROM || 'noreply@aurora.local',
        to: 'bulk-verify@test.test',
        subject: 'Verify',
        html: verifyHtml,
      }),
    );

    // Recover
    const recoverHtml = await renderTemplate('recover', {
      action_url: 'https://app.aurora.local/recover?token=test456',
    });
    results.push(
      transporter.sendMail({
        from: process.env.MAIL_FROM || 'noreply@aurora.local',
        to: 'bulk-recover@test.test',
        subject: 'Recover',
        html: recoverHtml,
      }),
    );

    // Role Changed
    const roleHtml = await renderTemplate('role-changed', {
      email: 'bulk-role@test.test',
      newRole: Role.ADMIN,
      previousRole: Role.USER,
    });
    results.push(
      transporter.sendMail({
        from: process.env.MAIL_FROM || 'noreply@aurora.local',
        to: 'bulk-role@test.test',
        subject: 'Role Changed',
        html: roleHtml,
      }),
    );

    // Account Deleted
    const deletedHtml = await renderTemplate('account-deleted', {
      email: 'bulk-deleted@test.test',
      revokedAt: new Date().toISOString(),
    });
    results.push(
      transporter.sendMail({
        from: process.env.MAIL_FROM || 'noreply@aurora.local',
        to: 'bulk-deleted@test.test',
        subject: 'Account Deleted',
        html: deletedHtml,
      }),
    );

    const settled = await Promise.allSettled(results);
    const successCount = settled.filter((r) => r.status === 'fulfilled').length;

    console.log(`📊 Bulk Send: ${successCount}/${results.length} emails sent successfully`);
    expect(successCount).toBe(results.length);
  });

  /**
   * Validaciones de contenido
   */
  describe('Template Content Validation', () => {
    it('All templates render without errors', async () => {
      const templates = ['welcome', 'verify', 'recover', 'role-changed', 'account-deleted'];

      for (const template of templates) {
        const html = await renderTemplate(template, {
          email: 'test@test.test',
          action_url: 'https://test.test',
          newRole: Role.ADMIN,
          previousRole: Role.USER,
          revokedAt: new Date().toISOString(),
        });

        expect(html).toBeTruthy();
        expect(html.length).toBeGreaterThan(100);
        console.log(`✅ ${template}: ${html.length} bytes`);
      }
    });

    it('Templates include responsive CSS', async () => {
      const html = await renderTemplate('welcome', {});
      expect(html).toContain('@media');
      expect(html).toContain('max-width');
    });

    it('Templates include dark mode support', async () => {
      const html = await renderTemplate('verify', {
        email: 'test@test.test',
        action_url: 'https://test.test',
      });
      expect(html).toContain('prefers-color-scheme');
    });
  });

  afterAll(async () => {
    if (testEmails.length > 0) {
      console.log(
        `\n📮 Test emails sent to: ${testEmails.join(', ')}\n` +
          `💡 Tip: Check Mailpit at http://localhost:8025 to see the emails\n`,
      );
    }
  });
});
