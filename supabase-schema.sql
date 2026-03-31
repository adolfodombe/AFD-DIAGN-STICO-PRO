-- Users Table
CREATE TABLE IF NOT EXISTS users (
  uid UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  displayName TEXT,
  photoURL TEXT,
  role TEXT DEFAULT 'user',
  subscriptionType TEXT DEFAULT 'free',
  subscriptionExpiresAt TIMESTAMPTZ,
  createdAt TIMESTAMPTZ DEFAULT NOW(),
  jobTitle TEXT,
  technicalLevel TEXT,
  bio TEXT,
  language TEXT DEFAULT 'pt'
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  image TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Diagnostics Table
CREATE TABLE IF NOT EXISTS diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amplifierModel TEXT,
  symptoms TEXT,
  recommendations TEXT,
  fullHistory JSONB,
  createdAt TIMESTAMPTZ DEFAULT NOW()
);

-- Activation Codes Table
CREATE TABLE IF NOT EXISTS activation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  days INTEGER NOT NULL,
  isUsed BOOLEAN DEFAULT FALSE,
  usedBy UUID REFERENCES auth.users(id),
  usedAt TIMESTAMPTZ,
  createdAt TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;

-- Policies for Users
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = uid);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = uid);
CREATE POLICY "Admins can view all profiles" ON users FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND role = 'admin')
);

-- Policies for Messages
CREATE POLICY "Users can view their own messages" ON messages FOR SELECT USING (auth.uid() = userId);
CREATE POLICY "Users can insert their own messages" ON messages FOR INSERT WITH CHECK (auth.uid() = userId);
CREATE POLICY "Users can delete their own messages" ON messages FOR DELETE USING (auth.uid() = userId);

-- Policies for Diagnostics
CREATE POLICY "Users can view their own diagnostics" ON diagnostics FOR SELECT USING (auth.uid() = userId);
CREATE POLICY "Users can insert their own diagnostics" ON diagnostics FOR INSERT WITH CHECK (auth.uid() = userId);
CREATE POLICY "Users can delete their own diagnostics" ON diagnostics FOR DELETE USING (auth.uid() = userId);

-- Policies for Activation Codes
CREATE POLICY "Anyone can view codes" ON activation_codes FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage codes" ON activation_codes FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND role = 'admin')
);
