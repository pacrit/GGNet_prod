// Versão simplificada para teste
export interface JWTPayload {
  userId: number
  email: string
  displayName: string
  iat?: number
  exp?: number
}

const JWT_SECRET = process.env.JWT_SECRET || "ggnetworking-dev-secret-key-2024-change-in-production"

// Função simples para criar JWT
export function generateToken(payload: JWTPayload): string {
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

// Hash simples para teste
export async function hashPassword(password: string): Promise<string> {
  try {
    console.log("🔄 Fazendo hash da senha...")

    if (!password || password.length < 6) {
      throw new Error("Senha deve ter pelo menos 6 caracteres")
    }

    // Usar uma abordagem mais simples primeiro
    const encoder = new TextEncoder()
    const data = encoder.encode(password + JWT_SECRET + "salt")

    // Verificar se crypto.subtle está disponível
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

// Verificar token
export function verifyToken(token: string): JWTPayload | null {
  try {
    if (!token) return null

    const parts = token.split(".")
    if (parts.length !== 3) return null

    const payload = JSON.parse(atob(parts[1]))

    if (!payload.userId || !payload.email || !payload.displayName) return null
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null

    const expectedSignature = btoa(`${parts[0]}.${parts[1]}.${JWT_SECRET}`).replace(/=/g, "")
    if (parts[2] !== expectedSignature) return null

    return payload
  } catch (error) {
    console.error("Erro ao verificar token:", error)
    return null
  }
}

// Comparar senhas
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    if (!password || !hash) return false
    const hashedInput = await hashPassword(password)
    return hashedInput === hash
  } catch (error) {
    console.error("Erro ao comparar senhas:", error)
    return false
  }
}
