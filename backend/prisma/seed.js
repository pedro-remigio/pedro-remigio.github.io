require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // ─── Admin ────────────────────────────────────────────────────────────────
  const email = process.env.ADMIN_EMAIL || "admin@remigioeventos.com";

  // Só cria o admin se ainda não existe — nunca sobrescreve a senha
  const adminExistente = await prisma.admin.findUnique({ where: { email } });
  if (!adminExistente) {
    const senha = process.env.ADMIN_PASSWORD || "admin123";
    const senhaHash = await bcrypt.hash(senha, 12);
    await prisma.admin.create({ data: { email, senha: senhaHash } });
    console.log(`Admin criado: ${email}`);
  } else {
    console.log(`Admin já existe: ${email}`);
  }

  // ─── Eventos ──────────────────────────────────────────────────────────────
  const eventos = [
    {
      titulo: "SuperCon Maceió",
      descricao:
        "O maior festival de cultura pop de Alagoas: anime, cosplay, games e muito mais reunidos em um só lugar. Três dias de programação intensa com atrações nacionais e internacionais.",
      data: new Date("2023-06-23T09:00:00"),
      local: "Centro de Convenções de Maceió",
      capacidade: 5000,
      imagem:
        "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200&auto=format&fit=crop",
      preco: null, // gratuito
      status: "encerrado",
    },
    {
      titulo: "Game Experience",
      descricao:
        "O evento de games mais aguardado do Nordeste. Torneios, lançamentos exclusivos, área de realidade virtual e encontro com streamers famosos. Venha viver a experiência gamer!",
      data: new Date("2025-04-24T10:00:00"),
      local: "Centro de Convenções de Maceió",
      capacidade: 3000,
      imagem:
        "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200&auto=format&fit=crop",
      preco: null, // gratuito
      status: "encerrado",
    },
    {
      titulo: "Campeonato de League of Legends Maceió",
      descricao:
        "O maior torneio de League of Legends de Maceió está de volta! Dispute com os melhores jogadores da cidade em partidas emocionantes. Inscreva sua equipe e concorra a prêmios. Vagas limitadas — garanta já a sua!",
      data: new Date("2026-08-08T19:00:00"),
      local: "BLACKOUT LAN HOUSE — R. Delegado Nataniel Ferreira da Silva, 102, Poço, Maceió/AL",
      capacidade: 64, // 16 times de 4 jogadores
      imagem:
        "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop",
      preco: 35.0,
      status: "ativo",
    },
    {
      titulo: "Tech Summit Nordeste 2026",
      descricao:
        "Conferência de tecnologia e inovação com palestras de especialistas em IA, cloud computing, desenvolvimento web e empreendedorismo digital. Networking e workshops práticos incluídos.",
      data: new Date("2026-09-15T08:00:00"),
      local: "Hotel Radisson Maceió",
      capacidade: 800,
      imagem:
        "https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=1200&auto=format&fit=crop",
      preco: null,
      status: "ativo",
    },
    {
      titulo: "Oxetech Festival 2026",
      descricao:
        "Festival de tecnologia, cultura maker e empreendedorismo reunindo startups, desenvolvedores e entusiastas de inovação. Hackathon, feira de projetos e muito aprendizado!",
      data: new Date("2026-11-08T09:00:00"),
      local: "Parque do Centenário, Maceió",
      capacidade: 2000,
      imagem:
        "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1200&auto=format&fit=crop",
      preco: null,
      status: "ativo",
    },
  ];

  for (const evento of eventos) {
    const existente = await prisma.evento.findFirst({
      where: { titulo: evento.titulo },
    });
    if (!existente) {
      await prisma.evento.create({ data: evento });
      console.log(`Evento criado: ${evento.titulo}`);
    } else {
      // Atualiza campos que podem ter mudado
      await prisma.evento.update({
        where: { id: existente.id },
        data: { preco: evento.preco, imagem: evento.imagem },
      });
      console.log(`Evento já existe (atualizado): ${evento.titulo}`);
    }
  }
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
