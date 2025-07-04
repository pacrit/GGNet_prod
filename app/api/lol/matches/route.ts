import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Token de autorização necessário" }, { status: 401 });
  }
  
  const token = authHeader.substring(7);
  const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
  const userId = payload.userId;

  const { startTime, endTime, queue } = await request.json();
  if (!startTime || !endTime || !queue) {
    return NextResponse.json({ error: "Parâmetros obrigatórios: startTime, endTime, queue" }, { status: 400 });
  }

  // Buscar o puuid do usuário no banco de dados
  const sql = neon(process.env.DATABASE_URL!);
  const result = await sql`
    SELECT puuid, region FROM valorant_accounts WHERE user_id = ${userId} LIMIT 1
  `;
  
  if (result.length === 0) {
    return NextResponse.json({ error: "Conta Riot não encontrada" }, { status: 404 });
  }

  const puuid = result[0].puuid;
  const region = result[0].region || "americas"; // Default para americas se não tiver região
  const apiKey = process.env.RIOT_API_KEY;

  try {
    // Converter queue para tipo da API (ranked, normal, etc.)
    const queueType = getQueueType(queue);
    
    // Buscar IDs das partidas
    const matchIdsUrl = `https://${region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?startTime=${Math.floor(startTime / 1000)}&endTime=${Math.floor(endTime / 1000)}&type=${queueType}&start=0&count=20&api_key=${apiKey}`;
    
    const matchIdsRes = await fetch(matchIdsUrl);
    if (!matchIdsRes.ok) {
      return NextResponse.json({ error: "Erro ao buscar IDs das partidas" }, { status: 500 });
    }
    
    const matchIds = await matchIdsRes.json();
    
    if (matchIds.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    // Buscar detalhes das partidas (limitando a 5 para não sobrecarregar)
    const matchDetails = await Promise.all(
      matchIds.slice(0, 5).map(async (matchId: string) => {
        const matchDetailsUrl = `https://${region}.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${apiKey}`;
        
        const matchRes = await fetch(matchDetailsUrl);
        if (!matchRes.ok) return null;
        
        const matchData = await matchRes.json();
        
        // Encontrar os dados do jogador específico
        const playerData = matchData.info.participants.find(
          (participant: any) => participant.puuid === puuid
        );
        
        if (!playerData) return null;
        
        return {
          gameId: matchData.metadata.matchId,
          gameCreation: matchData.info.gameCreation,
          gameDuration: matchData.info.gameDuration,
          gameMode: matchData.info.gameMode,
          queueId: matchData.info.queueId,
          win: playerData.win,
          championName: playerData.championName,
          championId: playerData.championId,
          kills: playerData.kills,
          deaths: playerData.deaths,
          assists: playerData.assists,
          totalDamageDealt: playerData.totalDamageDealt,
          totalDamageDealtToChampions: playerData.totalDamageDealtToChampions,
          goldEarned: playerData.goldEarned,
          item0: playerData.item0,
          item1: playerData.item1,
          item2: playerData.item2,
          item3: playerData.item3,
          item4: playerData.item4,
          item5: playerData.item5,
          item6: playerData.item6,
          summoner1Id: playerData.summoner1Id,
          summoner2Id: playerData.summoner2Id,
          riotIdGameName: playerData.riotIdGameName,
          riotIdTagline: playerData.riotIdTagline,
        };
      })
    );

    const validMatches = matchDetails.filter(match => match !== null);
    
    return NextResponse.json({ matches: validMatches });
    
  } catch (error) {
    console.error("Erro ao buscar partidas:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// Função auxiliar para converter queue ID para tipo da API
function getQueueType(queueId: string): string {
  const queueTypes: { [key: string]: string } = {
    "420": "ranked", // Ranked Solo/Duo
    "440": "ranked", // Ranked Flex
    "400": "normal", // Normal Draft
    "430": "normal", // Normal Blind
    "450": "normal", // ARAM
  };
  
  return queueTypes[queueId] || "normal";
}