import json, subprocess, re
meta = json.load(open('public/aulas/meta.json'))
FULL, VIEW = round(960*2532/1170), 860
def focus(img):
    cy = meta.get(img, {}).get('cy', 0.3)
    pos = (cy*FULL - VIEW/2)/(FULL-VIEW)
    pos = max(0, min(1, pos))
    return [max(0, pos-0.04), min(1, pos+0.04)]
def pauses(wav):
    out = subprocess.run(['ffmpeg','-hide_banner','-i',wav,'-af','silencedetect=noise=-32dB:d=0.16','-f','null','/dev/null'],capture_output=True,text=True).stderr
    st=[float(x) for x in re.findall(r'silence_start: ([0-9.]+)',out)]; en=[float(x) for x in re.findall(r'silence_end: ([0-9.]+)',out)]
    dur=float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',wav],capture_output=True,text=True).stdout)
    ps=[(a+b)/2 for a,b in zip(st,en) if a>0.05 and b<dur-0.05]
    s0 = en[0] if st and st[0]<0.05 and en else 0.0
    end = st[-1] if st and len(st)>len(en) else (st[-1] if st and abs(en[-1]-dur)<0.05 else dur)
    return s0, end, ps, dur
def segment(wav, lines):
    s0,end,ps,dur = pauses(wav)
    w=[len(l)+6 for l in lines]; T=sum(w); t=s0; b=[s0]
    for x in w: t+=x/T*(end-s0); b.append(t)
    used=set()
    for i in range(1,len(b)-1):
        cand=[p for p in ps if p not in used and b[i-1] < p]
        if not cand: continue
        m=min(cand,key=lambda p:abs(p-b[i]))
        if abs(m-b[i])<1.2: b[i]=m; used.add(m)
    for i in range(1,len(b)):  # garante ordem
        if b[i] <= b[i-1] + 0.4: b[i] = b[i-1] + 0.4
    b[0]=0; b[-1]=dur+0.8
    return b, dur
A = {
1: ("PRIMEIRO ACESSO", [
 ("Bem-vindo ao Trainer Pro Studio. Nesta aula você faz o primeiro acesso e cadastra o seu perfil. Leva dois minutos.", dict(kind='stat', big='AULA 1', sub='Primeiro acesso e seu perfil')),
 ("Abra o link do aplicativo e toque em Entrar.", dict(img='a1-entrar', title='TOQUE EM ENTRAR')),
 ("Na primeira vez, toque em Criar conta. Use o mesmo e-mail da compra na Kiwify e crie uma senha.", dict(img='a1-criar', title='CRIAR CONTA')),
 ("Pronto. O aplicativo abre na tela inicial.", dict(img='a1-inicio', title='TELA INICIAL')),
 ("Agora toque em Cadastrar meu perfil.", dict(img='a1-inicio', title='CADASTRAR MEU PERFIL')),
 ("Coloque seu nome, seu CREF e uma foto sua. Eles aparecem na capa de todos os programas.", dict(img='a1-perfil', title='NOME, CREF E FOTO')),
 ("Toque em Salvar.", dict(img='a1-salvar', title='SALVAR')),
 ("Dica: salve o aplicativo na tela inicial do celular. No navegador, toque em compartilhar e depois em Adicionar à Tela de Início.", dict(kind='flow', items=['Compartilhar', 'Adicionar à Tela de Início'], title='DICA')),
 ("Na próxima aula, você monta o seu primeiro programa.", dict(kind='stat', big='AULA 2', sub='Primeiro programa em 10 minutos', title='PRÓXIMA AULA')),
]),
2: ("PRIMEIRO PROGRAMA", [
 ("Agora você monta o primeiro programa. Na tela inicial, toque em Novo programa para um aluno.", dict(img='a2-novo', title='NOVO PROGRAMA')),
 ("Toque em Cadastrar novo aluno.", dict(img='a2-cadastrar', title='CADASTRAR NOVO ALUNO')),
 ("Coloque o nome, a foto e o WhatsApp do aluno.", dict(img='a2-aluno', title='NOME, FOTO E WHATSAPP')),
 ("Depois, os dados que fazem a recomendação: sexo, idade, objetivo, nível e onde ele treina.", dict(img='a2-dados', title='DADOS DO ALUNO')),
 ("Toque em Salvar. O aplicativo filtra os 60 programas e mostra os que combinam com esse aluno.", dict(img='a2-recomendados', title='PROGRAMAS RECOMENDADOS')),
 ("Abra um para ver os treinos. Gostou? Toque em Usar para, e o nome do aluno.", dict(img='a2-usar', title='USAR PARA O ALUNO')),
 ("Pronto. O programa sai com a capa personalizada: nome e foto do aluno, seu nome e seu CREF.", dict(img='a2-capa', title='CAPA PERSONALIZADA')),
 ("Confira tudo na aba Visualizar. Na próxima aula, você aprende a ajustar o que quiser.", dict(img='a2-aba', title='ABA VISUALIZAR')),
]),
3: ("PERSONALIZAR", [
 ("O programa veio pronto, mas você pode mudar tudo.", dict(kind='stat', big='AULA 3', sub='Personalizar e salvar seus modelos')),
 ("Na aba Dados e capa, você troca o título, a duração do ciclo e a frequência.", dict(img='a3-dados', title='DADOS E CAPA')),
 ("Na aba Treinos e exercícios, toque em um exercício para editar séries, repetições, descanso, cadência e carga.", dict(img='a3-exercicio', title='TREINOS E EXERCÍCIOS')),
 ("Use as setas para mudar a ordem, Duplicar para repetir e Excluir para tirar.", dict(img='a3-botoes', title='ORDEM, DUPLICAR, EXCLUIR')),
 ("Para incluir um exercício novo, toque em Exercício, com o sinal de mais.", dict(img='a3-novo-ex', title='+ EXERCÍCIO')),
 ("Quer mudar um slide? Na aba Visualizar, toque em Editar este slide e troque textos e imagens.", dict(img='a2-capa', title='EDITAR ESTE SLIDE')),
 ("Montou um programa que vai usar com outros alunos? Toque em Salvar como modelo.", dict(img='a3-modelo', title='SALVAR COMO MODELO')),
 ("Ele fica na sua Biblioteca, marcado como Meu modelo.", dict(img='a3-biblioteca', title='MEU MODELO')),
 ("Tudo é salvo automaticamente.", dict(img='a3-salvo', title='SALVO AUTOMATICAMENTE')),
]),
4: ("LIBERAR ACESSO", [
 ("Agora o aluno recebe o treino no celular. Dentro do programa, toque em Liberar acesso ao aluno.", dict(img='a4-liberar', title='LIBERAR ACESSO AO ALUNO')),
 ("Escolha a validade: trinta dias, que é o ciclo do programa, ou até você desativar.", dict(img='a4-validade', title='VALIDADE')),
 ("Toque em Gerar código.", dict(img='a4-gerar', title='GERAR CÓDIGO')),
 ("O aplicativo cria um código de oito letras só para esse aluno.", dict(img='a4-codigo', title='CÓDIGO DO ALUNO')),
 ("Toque em Enviar pelo WhatsApp. A mensagem já vai com o link e o código.", dict(img='a4-whatsapp', title='ENVIAR PELO WHATSAPP')),
 ("Se o aluno renovar, toque em mais trinta dias. Se ele parar, toque em Desativar e o acesso é bloqueado na hora.", dict(img='a4-renovar', title='+30 DIAS OU DESATIVAR')),
 ("Se você editar o programa depois, o aluno vê a mudança na hora, com o mesmo código.", dict(img='a2-capa', title='ATUALIZA NA HORA')),
]),
5: ("O QUE O ALUNO VÊ", [
 ("Assim fica para o seu aluno. Ele abre o link e digita o código. Não precisa de senha nem de instalar nada.", dict(img='a5-codigo', title='O ALUNO DIGITA O CÓDIGO')),
 ("Logo no início, ele vê o nome dele, a sua foto e o seu CREF.", dict(img='a5-topo', title='SUA MARCA')),
 ("Em Treino de hoje, ele escolhe o treino: A, B ou C.", dict(img='a5-treinos', title='TREINO DE HOJE')),
 ("Cada exercício tem foto, séries, repetições e descanso. Em Como fazer, ele lê a execução e os cuidados.", dict(img='a5-comofazer', title='COMO FAZER')),
 ("A cada série, ele digita as repetições e a carga e toca no check. O cronômetro de descanso começa sozinho.", dict(img='a5-serie', title='REGISTRA A CARGA')),
 ("No fim, toca em Concluir treino.", dict(img='a5-concluir', title='CONCLUIR TREINO')),
 ("Tudo fica no Histórico e aparece para você.", dict(img='a5-historico', title='HISTÓRICO')),
 ("No próximo treino, o aplicativo mostra a carga da última vez.", dict(img='a5-ultimavez', title='CARGA DA ÚLTIMA VEZ')),
]),
6: ("ACOMPANHAR E RENOVAR", [
 ("Agora você acompanha. Abra o programa do aluno e toque na aba Acompanhamento.", dict(img='a6-aba', title='ACOMPANHAMENTO')),
 ("Você vê quantos treinos ele registrou, quantos nos últimos trinta dias e o último acesso.", dict(img='a6-numeros', title='NÚMEROS DO ALUNO')),
 ("Logo abaixo, cada treino com séries, repetições e cargas.", dict(img='a6-treinos', title='CADA TREINO')),
 ("Use isso para ajustar a carga e para mostrar a evolução ao aluno.", dict(img='a6-treinos', title='AJUSTE E EVOLUÇÃO')),
 ("No fim das quatro semanas, monte o próximo programa: Novo programa para um aluno, escolha o mesmo aluno e use o próximo nível.", dict(img='a6-proximo', title='PRÓXIMO PROGRAMA')),
 ("E renove o acesso com mais trinta dias, ou gere um código para o novo programa.", dict(img='a6-renovar', title='RENOVAR O ACESSO')),
 ("Pronto. Esse é o ciclo completo: montar, liberar, acompanhar e renovar.", dict(kind='flow', items=['Montar', 'Liberar', 'Acompanhar', 'Renovar'], title='O CICLO COMPLETO')),
]),
}
for n,(name,items) in A.items():
    wav=f'public/aula{n}.wav'
    lines=[t for t,_ in items]
    b,dur=segment(wav, lines)
    scenes=[]
    for i,(t,sp) in enumerate(items):
        sc=dict(sp); sc['caption']=t; sc['start']=round(b[i],2); sc['end']=round(b[i+1],2)
        if 'img' in sc:
            sc['img']='aulas/'+sc['img']+'.png'; sc['kind']='phone'; sc['zoom']=focus(sp['img'])
        if i==0 and 'title' not in sc: sc['title']=f'AULA {n} · {name}'
        scenes.append(sc)
    json.dump({'audio':f'aula{n}.wav','duration':round(dur+0.8,2),'scenes':scenes},open(f'src/aula{n}.json','w'),ensure_ascii=False,indent=1)
    print(n, round(dur,1), [ (s['start'],s['end']) for s in scenes ])
