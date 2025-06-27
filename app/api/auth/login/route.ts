import { type NextRequest, NextResponse } from "next/server"

// Definir tudo diretamente no arquivo
interface JWTPayload {
  userId: number
  email: string
  displayName: string
  iat?: number
  exp?: number
}

const JWT_SECRET = process.env.JWT_SECRET || "ggnetworking-dev-secret-key-2024-change-in-production"

// Função para gerar token
function generateToken(payload: JWTPayload): string {
  try {
    const header = { alg: "HS256", typ: "JWT" }
    const now = Math.floor(Date.now() / 1000)
    const tokenPayload = { ...payload, iat: now, exp: now + 7 * 24 * 60 * 60 }

    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, "")
    const encodedPayload = btoa(JSON.stringify(tokenPayload)).replace(/=/g, "")
    const signature = btoa(`${encodedHeader}.${encodedPayload}.${JWT_SECRET}`).replace(/=/g, "")

    return `${encodedHeader}.${encodedPayload}.${signature}`
  } catch (error) {
    throw new Error("Falha ao gerar token: " + (error instanceof Error ? error.message : String(error)))
  }
}

// Função para hash da senha
async function hashPassword(password: string): Promise<string> {
  try {
    if (!password || password.length < 6) {
      throw new Error("Senha deve ter pelo menos 6 caracteres")
    }

    const encoder = new TextEncoder()
    const data = encoder.encode(password + JWT_SECRET + "salt")
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  } catch (error) {
    throw new Error("Falha ao fazer hash: " + (error instanceof Error ? error.message : String(error)))
  }
}

// Função para comparar senhas
async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    if (!password || !hash) return false
    const hashedInput = await hashPassword(password)
    return hashedInput === hash
  } catch (error) {
    return false
  }
}

// Função para conectar ao banco
async function connectDatabase() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL não encontrada")
    }

    const { neon } = await import("@neondatabase/serverless")
    return neon(process.env.DATABASE_URL)
  } catch (error) {
    throw new Error("Falha na conexão: " + (error instanceof Error ? error.message : String(error)))
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: "Email e senha são obrigatórios" }, { status: 400 })
    }

    const sql = await connectDatabase()

    const users = await sql`
      SELECT id, email, password_hash, display_name, avatar_url
      FROM users 
      WHERE email = ${email.toLowerCase().trim()}
    `

    if (users.length === 0) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 })
    }

    const user = users[0]

    // Para usuários demo, verificar senha simples
    const isValidPassword =
      user.password_hash === "demo_password"
        ? password === "123456"
        : await comparePassword(password, user.password_hash)

    if (!isValidPassword) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 })
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      displayName: user.display_name,
    })

    await sql`
      UPDATE users 
      SET updated_at = CURRENT_TIMESTAMP 
      WHERE id = ${user.id}
    `

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
      },
    })
  } catch (error) {
    console.error("Erro no login:", error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
