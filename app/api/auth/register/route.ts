import { type NextRequest, NextResponse } from "next/server"

// Definir tudo diretamente no arquivo para evitar problemas de import
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
    console.log("🔄 Gerando token...")

    const header = { alg: "HS256", typ: "JWT" }
    const now = Math.floor(Date.now() / 1000)
    const tokenPayload = { ...payload, iat: now, exp: now + 7 * 24 * 60 * 60 }

    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, "")
    const encodedPayload = btoa(JSON.stringify(tokenPayload)).replace(/=/g, "")
    const signature = btoa(`${encodedHeader}.${encodedPayload}.${JWT_SECRET}`).replace(/=/g, "")

    const token = `${encodedHeader}.${encodedPayload}.${signature}`
    console.log("✅ Token gerado, tamanho:", token.length)

    return token
  } catch (error) {
    console.error("❌ Erro ao gerar token:", error)
    throw new Error("Falha ao gerar token: " + (error instanceof Error ? error.message : String(error)))
  }
}

// Função para hash da senha
async function hashPassword(password: string): Promise<string> {
  try {
    console.log("🔄 Fazendo hash da senha...")

    if (!password || password.length < 6) {
      throw new Error("Senha deve ter pelo menos 6 caracteres")
    }

    const encoder = new TextEncoder()
    const data = encoder.encode(password + JWT_SECRET + "salt")

    if (!crypto || !crypto.subtle) {
      throw new Error("crypto.subtle não está disponível")
    }

    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

    console.log("✅ Hash criado, tamanho:", hash.length)
    return hash
  } catch (error) {
    console.error("❌ Erro ao fazer hash:", error)
    throw new Error("Falha ao fazer hash: " + (error instanceof Error ? error.message : String(error)))
  }
}

// Função para conectar ao banco
async function connectDatabase() {
  try {
    console.log("🔄 Conectando ao banco...")

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL não encontrada")
    }

    const { neon } = await import("@neondatabase/serverless")
    const sql = neon(process.env.DATABASE_URL)

    // Testar conexão
    const testResult = await sql`SELECT 1 as test`
    console.log("✅ Conexão com banco funcionou:", testResult)

    return sql
  } catch (error) {
    console.error("❌ Erro ao conectar banco:", error)
    throw new Error("Falha na conexão: " + (error instanceof Error ? error.message : String(error)))
  }
}

export async function POST(request: NextRequest) {
  console.log("=== INÍCIO DA API DE REGISTRO ===")

  try {
    // Teste 1: Parse do JSON
    let body
    try {
      body = await request.json()
      console.log("✅ Parse do JSON funcionou:", { ...body, password: "***" })
    } catch (error) {
      console.error("❌ Erro no parse do JSON:", error)
      return NextResponse.json({ error: "Erro no parse do JSON" }, { status: 400 })
    }

    const { email, password, displayName } = body

    // Teste 2: Validações básicas
    if (!email || !password || !displayName) {
      console.error("❌ Campos obrigatórios ausentes")
      return NextResponse.json({ error: "Todos os campos são obrigatórios" }, { status: 400 })
    }

    if (password.length < 6) {
      console.error("❌ Senha muito curta")
      return NextResponse.json({ error: "A senha deve ter pelo menos 6 caracteres" }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.error("❌ Email inválido")
      return NextResponse.json({ error: "Email inválido" }, { status: 400 })
    }

    console.log("✅ Validações básicas passaram")

    // Teste 3: Conectar ao banco
    let sql
    try {
      sql = await connectDatabase()
    } catch (error) {
      console.error("❌ Falha na conexão com banco:", error)
      return NextResponse.json(
        {
          error: "Erro de conexão com banco de dados",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      )
    }

    // Teste 4: Verificar se email já existe
    try {
      console.log("🔄 Verificando se email já existe...")
      const existingUsers = await sql`
        SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}
      `
      console.log("✅ Consulta executada, usuários encontrados:", existingUsers.length)

      if (existingUsers.length > 0) {
        console.error("❌ Email já em uso")
        return NextResponse.json({ error: "Email já está em uso" }, { status: 409 })
      }
    } catch (error) {
      console.error("❌ Erro ao verificar email:", error)
      return NextResponse.json(
        {
          error: "Erro ao verificar email no banco",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      )
    }

    // Teste 5: Hash da senha
    let passwordHash
    try {
      passwordHash = await hashPassword(password)
    } catch (error) {
      console.error("❌ Falha no hash da senha:", error)
      return NextResponse.json(
        {
          error: "Erro ao processar senha",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      )
    }

    // Teste 6: Criar usuário
    let newUser
    try {
      console.log("🔄 Criando usuário no banco...")
      const newUsers = await sql`
        INSERT INTO users (email, password_hash, display_name)
        VALUES (${email.toLowerCase().trim()}, ${passwordHash}, ${displayName.trim()})
        RETURNING id, email, display_name, avatar_url
      `
      console.log("✅ Usuário criado:", newUsers)

      if (!newUsers || newUsers.length === 0) {
        throw new Error("Nenhum usuário retornado após inserção")
      }

      newUser = newUsers[0]
    } catch (error) {
      console.error("❌ Erro ao criar usuário:", error)
      return NextResponse.json(
        {
          error: "Erro ao criar usuário",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      )
    }

    // Teste 7: Gerar token
    let token
    try {
      token = generateToken({
        userId: newUser.id,
        email: newUser.email,
        displayName: newUser.display_name,
      })
    } catch (error) {
      console.error("❌ Falha na geração do token:", error)
      return NextResponse.json(
        {
          error: "Erro ao gerar token",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      )
    }

    // Sucesso!
    const responseData = {
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.display_name,
        avatarUrl: newUser.avatar_url,
      },
    }

    console.log("🎉 Cadastro realizado com sucesso!")
    console.log("=== FIM DA API DE REGISTRO (SUCESSO) ===")

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("❌ ERRO GERAL:", error)
    console.error("Stack:", error instanceof Error ? error.stack : "N/A")

    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.stack : "N/A") : undefined,
      },
      { status: 500 },
    )
  }
}
