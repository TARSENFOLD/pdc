
import { createStrapi } from '@strapi/strapi';
import { randomUUID } from 'crypto';

async function main() {
  console.log('🚀 Iniciando Seed Narrativo Monumental v4.0 (World Class Infrastructure)');
  const app = await createStrapi().load();

  try {
    const areas = ['ENGENHARIA', 'SAUDE', 'TECNOLOGIA', 'GESTAO', 'ARTES', 'DIREITO'];
    
    // Helper para datas retroativas
    const daysAgo = (days: number) => {
      const date = new Date();
      date.setDate(date.getDate() - days);
      return date.toISOString();
    };

    const findOrCreate = async (uid: string, filters: any, data: any) => {
      const existing = await app.documents(uid as any).findFirst({ filters });
      if (existing) return existing;
      return await app.documents(uid as any).create({ data, status: 'published' });
    };

    // 1. Instituições de Prestígio
    console.log('🏛️ Criando Instituições...');
    const instData = [
      { nome: 'Universidade Agostinho Neto', slug: 'uan', tipo: 'Universidade', regiao: 'Luanda' },
      { nome: 'ISPTEC', slug: 'isptec', tipo: 'Instituto', regiao: 'Luanda' },
      { nome: 'Universidade Católica de Angola', slug: 'ucan', tipo: 'Universidade', regiao: 'Luanda' },
      { nome: 'Academia de Elite de Luanda', slug: 'ael', tipo: 'Centro de Formação', regiao: 'Luanda' }
    ];

    const instituicoes: any[] = [];
    for (const inst of instData) {
      const res = await findOrCreate('api::instituicao.instituicao', { slug: inst.slug }, {
        ...inst,
        email: `contato@${inst.slug}.ao`,
        aprovado: true,
        ativo: true
      });
      instituicoes.push(res);
    }

    // 2. Mentores de Elite
    console.log('👨‍🏫 Criando Mentores...');
    const mentorProfiles: any[] = [];
    for (let i = 0; i < 30; i++) {
      const area = areas[i % areas.length];
      const res = await findOrCreate('api::perfil.perfil', { email: `mentor${i}@pdc.ao` }, {
        nome: `Mentor Especialista ${i}`,
        email: `mentor${i}@pdc.ao`,
        tipo: 'mentor',
        userId: randomUUID(),
        areaFormacao: area,
        headline: `Especialista em ${area} com 10+ anos de experiência`,
        reputacao: 80 + Math.floor(Math.random() * 20),
        ativo: true,
        aprovado: true
      });
      mentorProfiles.push(res);
    }

    // 3. Simulações e Experiências
    console.log('🧪 Criando Simulações e Experiências...');
    const simulacoes: any[] = [];
    for (const area of areas) {
      const s = await findOrCreate('api::simulacao.simulacao', { slug: `sim-${area.toLowerCase()}` }, {
        titulo: `Simulação Profissional: ${area}`,
        slug: `sim-${area.toLowerCase()}`,
        descricao: `Teste as tuas habilidades práticas no domínio de ${area}.`,
        area: area,
        tipo: 1,
        estado: 'published'
      });
      simulacoes.push(s);

      await findOrCreate('api::experiencia.experiencia', { slug: `exp-${area.toLowerCase()}` }, {
        titulo: `Dia Aberto: ${area} na ${instituicoes[0].nome}`,
        slug: `exp-${area.toLowerCase()}`,
        descricao: `Vem conhecer os laboratórios e a rotina do curso de ${area}.`,
        area: area,
        vagas: 50,
        localizacao: 'Campus Universitário, Luanda',
        modalidade: 'presencial',
        dataInicio: daysAgo(-10),
        dataFim: daysAgo(-11),
        estado: 'published'
      });
    }

    // 4. As 100 Personas e Telemetria Massiva (9000 eventos)
    console.log('👥 Criando 100 Personas e Injetando 9000 Eventos de Telemetria...');
    const behaviorTypes = ['resiliente', 'impulsivo', 'metodico', 'indeciso'];
    
    for (let i = 0; i < 100; i++) {
      const behavior = behaviorTypes[i % behaviorTypes.length];
      const areaDesejada = areas[i % areas.length];
      const email = `aluno_persona_${i}@pdc.ao`;
      
      const aluno = await findOrCreate('api::perfil.perfil', { email }, {
        nome: `Estudante Persona ${i}`,
        email,
        tipo: 'aluno',
        userId: randomUUID(),
        areaInteresse: [areaDesejada],
        ativo: true,
        reputacao: 0
      });

      // Gerar ~90 eventos por aluno para atingir os 9000
      const sessionId = randomUUID();
      for (let e = 0; e < 90; e++) {
        // Lógica de Telemetria Baseada em Persona
        let eventType = 'input_valido';
        let dwellTime = 2000; // 2s baseline
        
        if (behavior === 'resiliente' && e % 10 === 0) eventType = 'erro_recuperado';
        if (behavior === 'impulsivo') dwellTime = 500;
        if (behavior === 'indeciso') dwellTime = 8000;
        if (behavior === 'metodico') dwellTime = 4000;

        await app.documents('api::telemetria.telemetria').create({
          data: {
            eventId: randomUUID(),
            sessionId,
            tipo: eventType,
            dados: { step: e, behavior, dwellTime },
            perfil: aluno.id,
            targetType: 'simulation',
            targetId: String(simulacoes[i % simulacoes.length].id),
            clientTimestamp: Date.now() - (e * 60000) // 1 min entre eventos
          },
          status: 'published'
        });
      }
      if (i % 10 === 0) console.log(`... ${i+10}% concluído`);
    }

    console.log('✅ Seed Narrativo Monumental Concluído com Sucesso!');
  } catch (err) {
    console.error('❌ Erro Fatal no Seed:', err);
  } finally {
    process.exit(0);
  }
}

main();
