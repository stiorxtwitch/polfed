-- ============================================================
-- Police Fédérale Liège City RP — Schéma Supabase
-- Exécuter dans l'éditeur SQL de votre projet Supabase
-- ============================================================

-- Table des utilisateurs (civils + policiers)
CREATE TABLE IF NOT EXISTS table_policefed_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'civil' CHECK (role IN ('civil', 'agent', 'supervision', 'officier')),
    grade VARCHAR(100),
    matricule VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des plaintes
CREATE TABLE IF NOT EXISTS table_policefed_complaints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    civil_id UUID REFERENCES table_policefed_users(id) ON DELETE CASCADE,
    assigned_officer_id UUID REFERENCES table_policefed_users(id),
    titre VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'en_cours', 'valide', 'ferme')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des messages de plainte
CREATE TABLE IF NOT EXISTS table_policefed_complaint_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    complaint_id UUID REFERENCES table_policefed_complaints(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES table_policefed_users(id),
    message TEXT,
    file_url TEXT,
    file_name TEXT,
    file_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des dossiers de recrutement
CREATE TABLE IF NOT EXISTS table_policefed_recruitments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    civil_id UUID REFERENCES table_policefed_users(id) ON DELETE CASCADE,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    age INTEGER,
    motivation TEXT NOT NULL,
    experience TEXT,
    disponibilite TEXT,
    status VARCHAR(20) DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'en_cours', 'valide', 'refuse', 'ferme')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des messages de recrutement
CREATE TABLE IF NOT EXISTS table_policefed_recruitment_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recruitment_id UUID REFERENCES table_policefed_recruitments(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES table_policefed_users(id),
    message TEXT,
    file_url TEXT,
    file_name TEXT,
    file_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des notifications
CREATE TABLE IF NOT EXISTS table_policefed_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES table_policefed_users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    related_id UUID,
    related_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des logs système (Officier uniquement)
CREATE TABLE IF NOT EXISTS table_policefed_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES table_policefed_users(id),
    user_name VARCHAR(200),
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Activer le Realtime pour les tables importantes
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE table_policefed_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE table_policefed_complaint_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE table_policefed_recruitment_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE table_policefed_complaints;
ALTER PUBLICATION supabase_realtime ADD TABLE table_policefed_recruitments;

-- ============================================================
-- Bucket de stockage pour les fichiers/photos
-- Créer via le dashboard Supabase: Storage > New Bucket
-- Nom: pfl-uploads  |  Public: true
-- ============================================================

-- ============================================================
-- Compte admin de démonstration (à supprimer en production)
-- ============================================================
INSERT INTO table_policefed_users (nom, prenom, username, password, role, grade, matricule)
VALUES ('Admin', 'Système', 'admin', 'Admin1234!', 'officier', 'Commissaire Général', 'MAT-0001')
ON CONFLICT (username) DO NOTHING;
