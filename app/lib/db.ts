// Database connection utilities for GGNetworking
export async function createConnection() {
  try {
    console.log("🔄 Criando conexão com banco...")

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL não encontrada nas variáveis de ambiente")
    }

    const { neon } = await import("@neondatabase/serverless")
    const sql = neon(process.env.DATABASE_URL)

    console.log("✅ Conexão criada com sucesso")
    return sql
  } catch (error) {
    console.error("❌ Erro ao criar conexão:", error)
    throw error
  }
}

// Export da conexão
let sqlInstance: any = null

export async function getSQL() {
  if (!sqlInstance) {
    sqlInstance = await createConnection()
  }
  return sqlInstance
}

// Named export 'sql' as required by deployment
export const sql = getSQL

// Tipos TypeScript
export interface User {
  id: number
  email: string
  display_name: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

// Função para testar conexão
export async function testConnection() {
  try {
    const sqlConnection = await getSQL()
    const result = await sqlConnection`SELECT 1 as test`
    return result.length > 0
  } catch (error) {
    console.error("Erro na conexão com o banco:", error)
    return false
  }
}
