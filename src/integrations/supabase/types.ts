export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      admin_setup_state: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: number
          operator_user_id: string | null
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: number
          operator_user_id?: string | null
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: number
          operator_user_id?: string | null
        }
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
      }
      user_roles: {
        Row: {
          app_role: 'admin' | 'user'
          created_at: string
          id: number
          user_id: string
        }
        Insert: {
          app_role?: 'admin' | 'user'
          created_at?: string
          id?: number
          user_id: string
        }
        Update: {
          app_role?: 'admin' | 'user'
          created_at?: string
          id?: number
          user_id?: string
        }
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          key: string
          name: string
          owner_id: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          key: string
          name: string
          owner_id: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          key?: string
          name?: string
          owner_id?: string
          start_date?: string | null
          updated_at?: string
        }
      }
      project_members: {
        Row: {
          id: string
          joined_at: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          project_id?: string
          role?: string
          user_id?: string
        }
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: 'low' | 'medium' | 'high'
          project_id: string
          reporter_id: string
          status: 'todo' | 'in_progress' | 'in_review' | 'done'
          task_id: string
          task_number: number
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: 'low' | 'medium' | 'high'
          project_id: string
          reporter_id: string
          status?: 'todo' | 'in_progress' | 'in_review' | 'done'
          task_id?: string
          task_number?: number
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: 'low' | 'medium' | 'high'
          project_id?: string
          reporter_id?: string
          status?: 'todo' | 'in_progress' | 'in_review' | 'done'
          task_id?: string
          task_number?: number
          title?: string
          updated_at?: string
        }
      }
      task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _user_id: string
          _role: 'admin' | 'user'
        }
        Returns: boolean
      }
      promote_initial_admin: {
        Args: {
          _admin_email: string
        }
        Returns: boolean
      }
      generate_task_id: {
        Args: {
          p_project_id: string
        }
        Returns: string
      }
      validate_status_transition: {
        Args: {
          p_current_status: 'todo' | 'in_progress' | 'in_review' | 'done'
          p_new_status: 'todo' | 'in_progress' | 'in_review' | 'done'
          p_user_id: string
          p_project_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: 'admin' | 'user'
      task_priority: 'low' | 'medium' | 'high'
      task_status: 'todo' | 'in_progress' | 'in_review' | 'done'
    }
  }
}
