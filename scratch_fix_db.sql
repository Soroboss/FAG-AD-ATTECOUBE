
-- Assure que la table management_users existe
CREATE TABLE IF NOT EXISTS public.management_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'consultation',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assure que l'admin par défaut existe (password: FAG2026@admin)
-- Hash sha256 de FAG2026@admin: d95a0629c10247600a9eaead5a7e77afaf49aab0f6c94dc698faf1b2b0385c72
INSERT INTO public.management_users (full_name, email, phone, password_hash, role, is_active)
SELECT 'Administrateur FAG', 'admin@fag.local', '2250700000000', 'd95a0629c10247600a9eaead5a7e77afaf49aab0f6c94dc698faf1b2b0385c72', 'admin', true
WHERE NOT EXISTS (SELECT 1 FROM public.management_users WHERE email = 'admin@fag.local');

-- On s'assure aussi que l'admin est actif
UPDATE public.management_users SET is_active = true WHERE email = 'admin@fag.local';
