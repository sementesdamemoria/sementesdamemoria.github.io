/* Sementes da Memória: comportamento do site (v3).
   Catálogo: lê dados/sementes.csv quando o site está publicado (http/https);
   ao abrir o arquivo direto do computador (file://), o navegador bloqueia essa leitura
   e o site usa a cópia incorporada em dados/sementes.js. */

(function () {
  'use strict';

  /* ---------- Menu (telas pequenas) ---------- */
  var botao = document.querySelector('.menu-botao');
  var menu = document.getElementById('menu');
  if (botao && menu) {
    botao.addEventListener('click', function () {
      var aberto = menu.classList.toggle('aberto');
      botao.setAttribute('aria-expanded', aberto ? 'true' : 'false');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        menu.classList.remove('aberto');
        botao.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Revelação suave e seção atual no menu ---------- */
  var revelaveis = [].slice.call(document.querySelectorAll('.revela'));
  if ('IntersectionObserver' in window) {
    var obsRevela = new IntersectionObserver(function (itens) {
      itens.forEach(function (i) {
        if (i.isIntersecting) { i.target.classList.add('visivel'); obsRevela.unobserve(i.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    revelaveis.forEach(function (el) { obsRevela.observe(el); });

    var links = [].slice.call(document.querySelectorAll('.menu a[href^="#"]'));
    var porId = {};
    links.forEach(function (a) { porId[a.getAttribute('href').slice(1)] = a; });
    var obsSecao = new IntersectionObserver(function (itens) {
      itens.forEach(function (i) {
        if (!i.isIntersecting) return;
        links.forEach(function (a) { a.removeAttribute('aria-current'); });
        var a = porId[i.target.id];
        if (a) a.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    porId.catalogo = porId.repositorio;    /* a consulta ao repositório pertence ao item "Repositório digital" */
    Object.keys(porId).forEach(function (id) {
      var s = document.getElementById(id); if (s) obsSecao.observe(s);
    });
  } else {
    revelaveis.forEach(function (el) { el.classList.add('visivel'); });
  }

  /* ---------- Contato (dados/config.js) ---------- */
  var C = window.CONTATO || {};
  if (C.email) {
    var assunto = encodeURIComponent(C.assunto || 'Contato: Sementes da Memória');
    var pend = document.querySelector('[data-contato-pendente]');
    var btn = document.querySelector('[data-contato-botao]');
    var lin = document.querySelector('[data-contato-email]');
    if (pend) pend.hidden = true;
    if (btn) { btn.href = 'mailto:' + C.email + '?subject=' + assunto; btn.hidden = false; }
    if (lin) {
      lin.textContent = '';
      var rot = document.createElement('span'); rot.textContent = 'E-mail: ';
      var lk = document.createElement('a');
      lk.href = 'mailto:' + C.email + '?subject=' + assunto; lk.textContent = C.email;
      lin.append(rot, lk); lin.hidden = false;
    }
    var tel = document.querySelector('[data-contato-telefone]');
    if (tel && C.telefone) { tel.textContent = C.telefone; tel.hidden = false; }
  }

  /* ---------- Vídeo: toca dentro da página quando houver o código do YouTube ---------- */
  var video = document.querySelector('.video-link');
  if (video) {
    var codigo = (video.getAttribute('data-youtube') || '').trim();
    if (!codigo) {
      video.addEventListener('click', function (e) { e.preventDefault(); });
    } else {
      video.addEventListener('click', function (e) {
        e.preventDefault();
        var f = document.createElement('iframe');
        f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(codigo) + '?autoplay=1&rel=0';
        f.title = 'Mestres do Apodi, Episódio 05: Golinha';
        f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        f.allowFullscreen = true;
        video.replaceWith(f);
      });
    }
  }

  /* ---------- Leitura do CSV ---------- */
  function parseCSV(texto) {
    texto = texto.replace(/^﻿/, '');
    var primeira = texto.split(/\r?\n/, 1)[0] || '';
    var sep = (primeira.split(';').length >= primeira.split(',').length) ? ';' : ',';
    var linhas = [], campo = '', linha = [], aspas = false;
    for (var i = 0; i < texto.length; i++) {
      var c = texto[i];
      if (aspas) {
        if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
        else if (c === '"') { aspas = false; }
        else { campo += c; }
      } else if (c === '"') { aspas = true; }
      else if (c === sep) { linha.push(campo); campo = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && texto[i + 1] === '\n') i++;
        linha.push(campo); campo = '';
        if (linha.length > 1 || linha[0] !== '') linhas.push(linha);
        linha = [];
      } else { campo += c; }
    }
    if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha); }
    if (!linhas.length) return [];
    var cab = linhas.shift().map(function (h) { return h.trim(); });
    return linhas.map(function (l) {
      var o = {};
      cab.forEach(function (h, k) { o[h] = (l[k] || '').trim(); });
      return o;
    });
  }

  function carregar() {
    var http = /^https?:$/.test(location.protocol);
    if (http && window.fetch) {
      return fetch('dados/sementes.csv', { cache: 'no-cache' })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
        .then(parseCSV)
        .catch(function () { return window.SEMENTES || []; });
    }
    return Promise.resolve(window.SEMENTES || []);
  }

  /* ---------- Catálogo ---------- */
  var CAMPOS = [
    ['procedencia', 'Procedência'],
    ['de_quem_veio', 'De quem veio'],
    ['plantio_guarda', 'Formas de plantio e guarda'],
    ['usos', 'Usos'],
    ['circulacao', 'Circulação'],
    ['historia', 'História associada']
  ];
  var PAGINA = 24;                       /* registros mostrados por vez */
  var PASTA_MINI = 'img/sementes/mini/'; /* miniaturas para a grade (cerca de 400 px) */
  var PASTA_FOTO = 'img/sementes/';      /* imagem maior para a ficha (cerca de 1200 px) */

  var secaoCat = document.getElementById('catalogo');
  var grade = document.getElementById('grade');
  var busca = document.getElementById('busca');
  var seletor = document.getElementById('grupo');
  var contagem = document.getElementById('contagem');
  var vazio = document.getElementById('vazio');
  var maisBtn = document.getElementById('mais');
  var ficha = document.getElementById('ficha');
  var registros = [], filtrados = [], mostrados = 0;

  function norm(s) {
    return (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function publicavel(r) { return norm(r.publicar) === 'sim' && r.nome_local; }

  function resumo(r) {
    var t = r.procedencia || r.historia || '';
    return t.length > 120 ? t.slice(0, 117).trim() + '…' : t;
  }

  function imagem(pasta, r, classe) {
    var img = document.createElement('img');
    img.src = pasta + encodeURIComponent(r.foto);
    img.alt = 'Fotografia da semente ' + r.nome_local;
    img.loading = 'lazy'; img.decoding = 'async';
    if (classe) img.className = classe;
    return img;
  }

  function cartao(r) {
    var art = document.createElement('article');
    art.className = 'cartao-semente';
    var foto = document.createElement('div'); foto.className = 'foto';
    if (r.foto) {
      var im = imagem(PASTA_MINI, r);
      im.addEventListener('error', function () { im.remove(); foto.textContent = 'Fotografia não disponível'; foto.classList.add('sem-foto'); });
      foto.appendChild(im);
    } else { foto.textContent = 'Fotografia não disponível'; foto.classList.add('sem-foto'); }
    var corpo = document.createElement('div'); corpo.className = 'corpo';
    var et = document.createElement('p'); et.className = 'etiqueta'; et.textContent = r.grupo || '';
    var h = document.createElement('h3'); h.textContent = r.nome_local;
    var p = document.createElement('p'); p.textContent = resumo(r);
    var b = document.createElement('button'); b.type = 'button'; b.textContent = 'Ver ficha';
    b.setAttribute('aria-label', 'Ver ficha: ' + r.nome_local);
    b.addEventListener('click', function () { abrir(r); });
    corpo.append(et, h, p, b);
    art.append(foto, corpo);
    return art;
  }

  function mostrarMais() {
    var fim = Math.min(mostrados + PAGINA, filtrados.length);
    for (var i = mostrados; i < fim; i++) grade.appendChild(cartao(filtrados[i]));
    mostrados = fim;
    maisBtn.hidden = mostrados >= filtrados.length;
    contagem.textContent = filtrados.length + (filtrados.length === 1 ? ' registro' : ' registros') +
      (registros.length !== filtrados.length ? ' de ' + registros.length : '') +
      (mostrados < filtrados.length ? ' (mostrando ' + mostrados + ')' : '');
  }

  function desenhar() {
    var q = norm(busca.value.trim());
    var g = seletor.value;
    filtrados = registros.filter(function (r) {
      if (g && r.grupo !== g) return false;
      if (!q) return true;
      return norm([r.nome_local, r.grupo, r.procedencia, r.de_quem_veio, r.plantio_guarda, r.usos,
                   r.circulacao, r.historia, r.poema_relacionado].join(' ')).indexOf(q) !== -1;
    });
    grade.textContent = '';
    mostrados = 0;
    vazio.hidden = filtrados.length !== 0;
    mostrarMais();
  }

  function abrir(r) {
    document.getElementById('ficha-grupo').textContent = r.grupo || '';
    document.getElementById('ficha-titulo').textContent = r.nome_local;
    var fotoBox = document.getElementById('ficha-foto');
    fotoBox.textContent = '';
    fotoBox.classList.toggle('com-foto', !!r.foto);
    if (r.foto) {
      var im = imagem(PASTA_FOTO, r);
      im.addEventListener('error', function () { im.remove(); fotoBox.classList.remove('com-foto'); fotoBox.textContent = 'Fotografia não disponível'; });
      fotoBox.appendChild(im);
    } else { fotoBox.textContent = 'Fotografia não disponível'; }
    var dl = document.getElementById('ficha-campos');
    dl.textContent = '';
    CAMPOS.forEach(function (c) {
      if (!r[c[0]]) return;
      var dt = document.createElement('dt'); dt.textContent = c[1];
      var dd = document.createElement('dd'); dd.textContent = r[c[0]];
      dl.append(dt, dd);
    });
    var poema = document.getElementById('ficha-poema');
    poema.hidden = !r.poema_relacionado;
    poema.textContent = r.poema_relacionado || '';
    document.getElementById('ficha-fonte').textContent = r.fonte_informacao ? 'Fonte da informação: ' + r.fonte_informacao : '';
    if (typeof ficha.showModal === 'function') ficha.showModal(); else ficha.setAttribute('open', '');
  }

  ficha.addEventListener('click', function (e) { if (e.target === ficha) ficha.close(); });
  maisBtn.addEventListener('click', mostrarMais);

  function iniciar(dados) {
    registros = dados.filter(publicavel).sort(function (a, b) {
      return a.nome_local.localeCompare(b.nome_local, 'pt-BR');
    });
    if (!registros.length) return;          /* sem registros publicáveis, a seção continua oculta */
    secaoCat.hidden = false;
    var grupos = [];
    registros.forEach(function (r) { if (r.grupo && grupos.indexOf(r.grupo) === -1) grupos.push(r.grupo); });
    grupos.sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); }).forEach(function (g) {
      var o = document.createElement('option'); o.value = g; o.textContent = g; seletor.appendChild(o);
    });
    busca.addEventListener('input', desenhar);
    seletor.addEventListener('change', desenhar);
    desenhar();
  }

  carregar().then(iniciar);
})();
