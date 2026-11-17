
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "academy": {
                  Row: {
                    "created_at": string,"id": string,"logo_url": string | null,"name": string,"season_end": string,"season_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"logo_url"?: string | null,"name": string,"season_end": string,"season_start": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"logo_url"?: string | null,"name"?: string,"season_end"?: string,"season_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"coach_assignments": {
                  Row: {
                    "coach_id": string,"created_at": string,"id": string,"squad_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "coach_id": string,"created_at"?: string,"id"?: string,"squad_id": string
                  }
                  Update: {
                    "coach_id"?: string,"created_at"?: string,"id"?: string,"squad_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "coach_assignments_coach_id_fkey"
      columns: ["coach_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "coach_assignments_squad_id_fkey"
      columns: ["squad_id"]
isOneToOne: false
      referencedRelation: "squads"
      referencedColumns: ["id"]
    }
                  ]
                },"players": {
                  Row: {
                    "created_at": string,"date_of_birth": string | null,"dominant_hand": Database["public"]['Enums']["dominant_hand"],"full_name": string,"height_cm": number | null,"id": string,"jersey_number": number | null,"primary_position": Database["public"]['Enums']["player_position"],"secondary_position": Database["public"]['Enums']["player_position"] | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"date_of_birth"?: string | null,"dominant_hand"?: Database["public"]['Enums']["dominant_hand"],"full_name": string,"height_cm"?: number | null,"id"?: string,"jersey_number"?: number | null,"primary_position": Database["public"]['Enums']["player_position"],"secondary_position"?: Database["public"]['Enums']["player_position"] | null,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"date_of_birth"?: string | null,"dominant_hand"?: Database["public"]['Enums']["dominant_hand"],"full_name"?: string,"height_cm"?: number | null,"id"?: string,"jersey_number"?: number | null,"primary_position"?: Database["public"]['Enums']["player_position"],"secondary_position"?: Database["public"]['Enums']["player_position"] | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "players_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"full_name": string,"id": string,"must_change_password": boolean,"preferred_language": string,"role": Database["public"]['Enums']["user_role"],"username": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"full_name": string,"id": string,"must_change_password"?: boolean,"preferred_language"?: string,"role": Database["public"]['Enums']["user_role"],"username": string
                  }
                  Update: {
                    "created_at"?: string,"full_name"?: string,"id"?: string,"must_change_password"?: boolean,"preferred_language"?: string,"role"?: Database["public"]['Enums']["user_role"],"username"?: string
                  }
                  Relationships: [
                    
                  ]
                },"squad_memberships": {
                  Row: {
                    "created_at": string,"end_date": string | null,"id": string,"player_id": string,"squad_id": string,"start_date": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"end_date"?: string | null,"id"?: string,"player_id": string,"squad_id": string,"start_date"?: string
                  }
                  Update: {
                    "created_at"?: string,"end_date"?: string | null,"id"?: string,"player_id"?: string,"squad_id"?: string,"start_date"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "squad_memberships_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "squad_memberships_squad_id_fkey"
      columns: ["squad_id"]
isOneToOne: false
      referencedRelation: "squads"
      referencedColumns: ["id"]
    }
                  ]
                },"squads": {
                  Row: {
                    "age_group": string,"created_at": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "age_group": string,"created_at"?: string,"id"?: string,"name": string
                  }
                  Update: {
                    "age_group"?: string,"created_at"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "app_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["user_role"]
                           },
"coaches_player":
{ Args: { "target_player_id": string }; Returns: boolean
                           },
"coaches_player_profile":
{ Args: { "target_profile_id": string }; Returns: boolean
                           },
"coaches_squad":
{ Args: { "target_squad_id": string }; Returns: boolean
                           },
"move_player":
{ Args: { "target_player_id": string,"target_squad_id": string }; Returns: undefined
                           },
"own_player_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"own_squad_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           }
          }
          Enums: {
            "dominant_hand": "right"|"left"|"both","player_position": "outside_hitter"|"opposite"|"setter"|"middle_blocker"|"libero"|"defensive_specialist","user_role": "director"|"coach"|"player"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "dominant_hand": ["right", "left", "both"],"player_position": ["outside_hitter", "opposite", "setter", "middle_blocker", "libero", "defensive_specialist"],"user_role": ["director", "coach", "player"]
          }
        }
} as const
