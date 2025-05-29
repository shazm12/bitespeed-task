CREATE TABLE contact_details (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255),
  phone_number VARCHAR(255),
  linked_id INTEGER REFERENCES contact_details(id) ON DELETE SET NULL,
  link_precedence TEXT NOT NULL CHECK (link_precedence IN ('primary', 'secondary')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);
CREATE INDEX idx_contact_details_email ON contact_details(email) WHERE email IS NOT NULL;
CREATE INDEX idx_contact_details_phone_number ON contact_details(phone_number) WHERE phone_number IS NOT NULL;