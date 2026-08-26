-- H5P Core Tables for @lumieducation/h5p-server
-- We use JSONB to store the metadata because the H5P schema is complex and subject to change based on the library.

-- 1. Libraries (Content Types like H5P.DragAndDrop)
CREATE TABLE h5p_libraries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_name VARCHAR(255) NOT NULL,
    major_version INTEGER NOT NULL,
    minor_version INTEGER NOT NULL,
    patch_version INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    runnable INTEGER NOT NULL DEFAULT 0,
    restricted BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB NOT NULL, -- The full library.json content
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(machine_name, major_version, minor_version)
);

CREATE INDEX idx_h5p_libraries_machine_name ON h5p_libraries(machine_name);

-- 2. Library Dependencies (To quickly resolve what libraries rely on others)
CREATE TABLE h5p_library_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    library_id UUID REFERENCES h5p_libraries(id) ON DELETE CASCADE,
    required_machine_name VARCHAR(255) NOT NULL,
    required_major_version INTEGER NOT NULL,
    required_minor_version INTEGER NOT NULL,
    dependency_type VARCHAR(50) NOT NULL, -- e.g., 'preloaded', 'dynamic', 'editor'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_h5p_library_deps_lib_id ON h5p_library_dependencies(library_id);

-- 3. Content Dependencies (What libraries a specific piece of content uses)
-- The h5p_contents table already exists, but we need to track its dependencies
CREATE TABLE h5p_content_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID REFERENCES h5p_contents(id) ON DELETE CASCADE,
    library_id UUID REFERENCES h5p_libraries(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) NOT NULL, -- e.g., 'preloaded', 'dynamic', 'editor'
    drop_css BOOLEAN NOT NULL DEFAULT false,
    weight INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_h5p_content_deps_content_id ON h5p_content_dependencies(content_id);

-- 4. User Data (For saving progress/state of the content)
CREATE TABLE h5p_user_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID REFERENCES h5p_contents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    data_id VARCHAR(255) NOT NULL, -- Usually 'state'
    sub_content_id VARCHAR(255) NOT NULL DEFAULT '0',
    data TEXT NOT NULL,
    preload BOOLEAN NOT NULL DEFAULT false,
    invalidate BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(content_id, user_id, data_id, sub_content_id)
);

CREATE INDEX idx_h5p_user_data_content_user ON h5p_user_data(content_id, user_id);

-- 5. Add RLS Policies
ALTER TABLE h5p_libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE h5p_library_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE h5p_content_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE h5p_user_data ENABLE ROW LEVEL SECURITY;

-- Libraries are public for reading, only admins can write (or system via API)
CREATE POLICY "Public can view h5p_libraries" ON h5p_libraries FOR SELECT USING (true);
CREATE POLICY "System can manage h5p_libraries" ON h5p_libraries FOR ALL USING (true); -- Usually restricted to admin role in prod

CREATE POLICY "Public can view h5p_library_dependencies" ON h5p_library_dependencies FOR SELECT USING (true);
CREATE POLICY "System can manage h5p_library_dependencies" ON h5p_library_dependencies FOR ALL USING (true);

CREATE POLICY "Public can view h5p_content_dependencies" ON h5p_content_dependencies FOR SELECT USING (true);
CREATE POLICY "System can manage h5p_content_dependencies" ON h5p_content_dependencies FOR ALL USING (true);

CREATE POLICY "Users can manage their own h5p_user_data" ON h5p_user_data FOR ALL USING (auth.uid() = user_id);
