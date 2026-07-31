/**
 * @module data
 * @description Static content data for the ABA landing page.
 *
 * Contains the FAQ (Frequently Asked Questions) array used by the
 * landing page accordion component. Each entry has a question (`q`)
 * and answer (`a`) as plain text strings.
 *
 * Topics covered:
 * - Pricing and free tier details
 * - Database inactivity pause policy
 * - Supported engines (MySQL, SQL Server)
 * - Framework/ORM compatibility
 * - Security (encryption at rest/in transit)
 * - Data export capabilities
 *
 * @see pages/Landing.tsx — FAQ accordion rendering
 */

export const FAQ = [
  {
    q: 'Is ABA really free?',
    a: 'Yes. ABA provides free MySQL and SQL Server databases with a controlled 20 MB quota per database — no credit card required.',
  },
  {
    q: 'How long do databases stay active?',
    a: 'Databases are paused after 7 days of inactivity by default. You can configure this in Settings or enable activity pings to keep them always-on.',
  },
  {
    q: 'What database engines are supported?',
    a: 'ABA currently supports MySQL 8.0 and SQL Server. More engines may be added as the platform evolves.',
  },
  {
    q: 'Can I connect my framework or ORM?',
    a: 'Yes. ABA databases work with clients and ORMs that support standard MySQL or SQL Server connections.',
  },
  {
    q: 'Is my data secure?',
    a: 'All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We perform daily encrypted backups and provide IP allowlisting and API key scoping for access control.',
  },
  {
    q: 'Can I export my data?',
    a: 'Yes. You can export your database as a full SQL dump at any time from the Database Settings page. There are no data lock-in policies at ABA.',
  },
]
