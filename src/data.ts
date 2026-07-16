export const FAQ = [
  {
    q: 'Is ABA really free?',
    a: 'Yes. ABA provides free PostgreSQL and MySQL databases with 512 MB storage, 20 connections, and unlimited queries — no credit card required, ever.',
  },
  {
    q: 'How long do databases stay active?',
    a: 'Databases are paused after 7 days of inactivity by default. You can configure this in Settings or enable activity pings to keep them always-on.',
  },
  {
    q: 'What database engines are supported?',
    a: 'ABA currently supports PostgreSQL 14, 15, and 16, and MySQL 8.0. More engines including Redis and SQLite are on the roadmap.',
  },
  {
    q: 'Can I connect my framework or ORM?',
    a: 'Yes. ABA databases work with any client that supports standard PostgreSQL or MySQL protocols — Prisma, Drizzle, SQLAlchemy, Hibernate, and more.',
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
