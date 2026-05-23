-- Fix dummy user by adding required jsonb fields
UPDATE auth.users 
SET raw_app_meta_data = '{"provider": "email", "providers": ["email"]}'::jsonb,
    raw_user_meta_data = '{}'::jsonb,
    is_super_admin = false,
    phone = NULL,
    phone_confirmed_at = NULL,
    confirmation_token = '',
    recovery_token = '',
    email_change_token_new = '',
    email_change = ''
WHERE email = 'dummy_dispatcher@cargonode.com' AND raw_app_meta_data IS NULL;
