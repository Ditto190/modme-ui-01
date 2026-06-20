// Auto-generate with: npx supabase gen types typescript --project-id <your-project-id> > src/lib/supabase/types.ts
// This is a manual baseline matching the migration schema.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          role: "user" | "admin" | "consultant";
          preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          role?: "user" | "admin" | "consultant";
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          avatar_url?: string | null;
          role?: "user" | "admin" | "consultant";
          preferences?: Json;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string | null;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          description?: string | null;
          settings?: Json;
        };
        Update: {
          name?: string;
          description?: string | null;
          settings?: Json;
        };
      };
      conversations: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          title: string | null;
          agent_model: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          title?: string | null;
          agent_model?: string;
          metadata?: Json;
        };
        Update: {
          title?: string | null;
          agent_model?: string;
          metadata?: Json;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: "user" | "assistant" | "system" | "tool";
          content: string;
          tool_calls: Json | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: "user" | "assistant" | "system" | "tool";
          content: string;
          tool_calls?: Json | null;
          metadata?: Json;
        };
        Update: {
          content?: string;
          metadata?: Json;
        };
      };
      ui_elements: {
        Row: {
          id: string;
          conversation_id: string;
          element_key: string;
          element_type: "StatCard" | "DataTable" | "ChartCard" | "Custom";
          props: Json;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          element_key: string;
          element_type: "StatCard" | "DataTable" | "ChartCard" | "Custom";
          props?: Json;
          position?: number;
        };
        Update: {
          element_key?: string;
          element_type?: "StatCard" | "DataTable" | "ChartCard" | "Custom";
          props?: Json;
          position?: number;
        };
      };
      toolsets: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          icon: string | null;
          is_default: boolean;
          tools: string[];
          category: string | null;
          status: "active" | "deprecated" | "experimental" | "beta";
          version: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description?: string | null;
          icon?: string | null;
          is_default?: boolean;
          tools?: string[];
          category?: string | null;
          status?: "active" | "deprecated" | "experimental" | "beta";
          version?: string;
          metadata?: Json;
        };
        Update: {
          name?: string;
          description?: string | null;
          tools?: string[];
          status?: "active" | "deprecated" | "experimental" | "beta";
          version?: string;
          metadata?: Json;
        };
      };
      audit_log: {
        Row: {
          id: string;
          user_id: string | null;
          project_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          project_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          details?: Json;
        };
        Update: never;
      };
      journal_entries: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          tags: string[];
          embedding: number[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          tags?: string[];
          embedding?: number[] | null;
        };
        Update: {
          content?: string;
          tags?: string[];
          embedding?: number[] | null;
        };
      };
      file_uploads: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          file_name: string;
          file_path: string;
          file_size: number | null;
          mime_type: string | null;
          category: "raw" | "processed" | "reports";
          storage_bucket: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          file_name: string;
          file_path: string;
          file_size?: number | null;
          mime_type?: string | null;
          category?: "raw" | "processed" | "reports";
          storage_bucket?: string;
          metadata?: Json;
        };
        Update: {
          file_name?: string;
          metadata?: Json;
        };
      };
    };
  };
}
