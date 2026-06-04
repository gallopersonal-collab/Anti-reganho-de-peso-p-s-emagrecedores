import React, { useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Link } from "react-router-dom";
import { PLANS, CATS, CAT_COLOR, CAT_BADGE } from "../data/workoutPlans";
import { iconFor } from "../data/exerciseLibrary";
import "./BancoDeTreinos.css";

const catCount = (c) =>
  c === "all" ? PLANS.length : PLANS.filter((p) => p.cat === c).length;

const SvgFromString = ({ html, color, size }) => (
  <span
    style={{ color, display: "inline-flex", width: size, height: size }}
    dangerouslySetInnerHTML={{ __html: html }}
  />
);

function Sidebar({ cat, setCat, sidebarOpen, setSidebarOpen }) {
  return (
    <>
      <aside className={`btp-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="btp-sidebar-logo">
          <Link to="/" className="btp-back-home">
            ← Voltar para o site
          </Link>
          <div className="btp-brand">
            Banco de Treinos
            <br />
            Profissional
          </div>
          <div className="btp-sub">30 Planilhas por Objetivo</div>
        </div>
        {CATS.map((c) => (
          <button
            key={c.id}
            className={`btp-nav-item ${cat === c.id ? "active" : ""}`}
            onClick={() => {
              setCat(c.id);
              setSidebarOpen(false);
            }}
          >
            <span className="btp-nav-dot" style={{ background: c.dot }} />
            <span>{c.label}</span>
            <span className="btp-nav-count">{catCount(c.id)}</span>
          </button>
        ))}
        <div className="btp-sidebar-footer">Instituto Gallo Personal</div>
      </aside>
      <div
        className={`btp-backdrop ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />
    </>
  );
}

function HomeView({ cat, search, setSearch, onOpen, setSidebarOpen }) {
  const plans = useMemo(() => {
    let result = cat === "all" ? PLANS : PLANS.filter((p) => p.cat === cat);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          p.profile.toLowerCase().includes(s)
      );
    }
    return result;
  }, [cat, search]);

  return (
    <div className="btp-main">
      <button
        className="btp-menu-trigger"
        onClick={() => setSidebarOpen(true)}
        aria-label="Abrir menu"
      >
        ☰ Categorias
      </button>

      <div className="btp-page-header">
        <div className="btp-page-title">Banco de Treinos Profissional</div>
        <div className="btp-page-sub">
          30 planilhas prontas para uso imediato — selecione, personalize e gere
          PDF
        </div>
      </div>

      <div className="btp-stats-bar">
        <div className="btp-stat-card">
          <div className="btp-stat-num">30</div>
          <div className="btp-stat-lbl">Planilhas prontas</div>
        </div>
        <div className="btp-stat-card">
          <div className="btp-stat-num">4</div>
          <div className="btp-stat-lbl">Objetivos</div>
        </div>
        <div className="btp-stat-card">
          <div className="btp-stat-num">4</div>
          <div className="btp-stat-lbl">Semanas de progressão</div>
        </div>
        <div className="btp-stat-card">
          <div className="btp-stat-num">∞</div>
          <div className="btp-stat-lbl">Alunos atendidos</div>
        </div>
      </div>

      <div className="btp-action-bar">
        <input
          className="btp-search-input"
          type="text"
          placeholder="Buscar planilha..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {plans.length} planilha{plans.length !== 1 ? "s" : ""}
          {cat !== "all" && ` em ${CATS.find((c) => c.id === cat).label}`}
        </span>
      </div>

      <div className="btp-plans-grid">
        {plans.length ? (
          plans.map((p) => (
            <button
              key={p.id}
              className="btp-plan-card"
              onClick={() => onOpen(p)}
            >
              <span className={`btp-plan-badge ${CAT_BADGE[p.cat]}`}>
                {CATS.find((c) => c.id === p.cat).label}
              </span>
              <div className="btp-plan-name">{p.name}</div>
              <div className="btp-plan-meta">{p.freq}</div>
              <span className="btp-plan-level">{p.level}</span>
            </button>
          ))
        ) : (
          <div className="btp-empty">Nenhuma planilha encontrada.</div>
        )}
      </div>
    </div>
  );
}

function PlanView({ plan, onBack, setSidebarOpen }) {
  const [studentName, setStudentName] = useState("");
  const [ptName, setPtName] = useState("");
  const [openInfo, setOpenInfo] = useState({});
  const [generating, setGenerating] = useState(false);
  const printAreaRef = useRef(null);

  const catObj = CATS.find((c) => c.id === plan.cat);
  const catColor = CAT_COLOR[plan.cat] || "var(--amber)";

  const toggleInfo = (idx) =>
    setOpenInfo((prev) => ({ ...prev, [idx]: !prev[idx] }));

  const generatePDF = async () => {
    const node = printAreaRef.current;
    if (!node) return;
    setGenerating(true);
    node.classList.add("btp-pdf-mode");
    try {
      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 16;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 8;

      pdf.addImage(imgData, "PNG", 8, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 16;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 8;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 8, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `${
        studentName ? studentName.toLowerCase().replace(/\s+/g, "-") + "-" : ""
      }treino-${plan.id}-${plan.name.toLowerCase().replace(/\s+/g, "-")}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      node.classList.remove("btp-pdf-mode");
      setGenerating(false);
    }
  };

  const shareWhatsApp = () => {
    const aluno = studentName || "(sem nome)";
    let txt = `*PLANILHA DE TREINO — ${plan.name}*\n*Aluno:* ${aluno}\n`;
    if (ptName) txt += `*Personal:* ${ptName}\n`;
    txt += `\n*Objetivo:* ${catObj.label}\n*Frequência:* ${plan.freq} | *Nível:* ${plan.level}\n\n*EXERCÍCIOS*\n`;
    plan.exercises.forEach((e, i) => {
      if (e.s === "—") {
        txt += `\n_${e.n}_\n`;
      } else {
        txt += `${i + 1}. ${e.n} — ${e.s} x ${e.r}${
          e.c && e.c !== "—" ? " | " + e.c : ""
        } | Descanso: ${e.rest}\n`;
      }
    });
    txt += `\n*PROGRESSÃO*\n`;
    plan.prog.forEach((w) => {
      txt += `Sem ${w.w}: ${w.focus} — ${w.detail}\n`;
    });
    if (ptName) txt += `\n_Planilha elaborada por ${ptName} · Instituto Gallo Personal_`;
    window.open("https://wa.me/?text=" + encodeURIComponent(txt), "_blank");
  };

  return (
    <div className="btp-main">
      <button
        className="btp-menu-trigger"
        onClick={() => setSidebarOpen(true)}
        aria-label="Abrir menu"
      >
        ☰ Categorias
      </button>

      <div className="btp-detail-actions">
        <button className="btp-back-btn" onClick={onBack}>
          ← Voltar
        </button>
        <button
          className="btp-action-btn primary"
          onClick={generatePDF}
          disabled={generating}
        >
          {generating ? "Gerando..." : "⬇ Salvar PDF"}
        </button>
        <button className="btp-action-btn whatsapp" onClick={shareWhatsApp}>
          WhatsApp
        </button>
      </div>

      <div className="btp-detail-view" ref={printAreaRef}>
        <div className="btp-detail-header">
          <div className="btp-detail-badges">
            <span className={`btp-plan-badge ${CAT_BADGE[plan.cat]}`}>
              {catObj.label}
            </span>
            <span
              className="btp-plan-badge"
              style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
            >
              {plan.level}
            </span>
            <span
              className="btp-plan-badge"
              style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
            >
              {plan.freq}
            </span>
          </div>
          <div className="btp-detail-title">{plan.name}</div>
          <div className="btp-info-grid">
            <div className="btp-info-item">
              <label>Nome do Aluno</label>
              <input
                type="text"
                placeholder="Digite o nome do aluno..."
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
              />
            </div>
            <div className="btp-info-item">
              <label>Personal Trainer</label>
              <input
                type="text"
                placeholder="Seu nome ou CREF..."
                value={ptName}
                onChange={(e) => setPtName(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="btp-section">
          <div className="btp-section-title">Perfil do Aluno</div>
          <div className="btp-obs-box">{plan.profile}</div>
        </div>

        <div className="btp-section">
          <div className="btp-section-title">Observações Clínicas</div>
          <div
            className="btp-obs-box"
            style={{ borderLeftColor: catColor }}
          >
            {plan.obs}
          </div>
        </div>

        <div className="btp-section">
          <div className="btp-section-title">
            Exercícios{" "}
            <span
              style={{
                fontWeight: 400,
                textTransform: "none",
                letterSpacing: 0,
                fontSize: 11,
                color: "var(--text-secondary)",
              }}
            >
              — clique no ícone para ver execução
            </span>
          </div>
          <div className="btp-table-wrap">
            <table className="btp-exercise-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <th>#</th>
                  <th>Exercício</th>
                  <th>Séries</th>
                  <th>Reps</th>
                  <th>Carga</th>
                  <th>Descanso</th>
                </tr>
              </thead>
              <tbody>
                {plan.exercises.map((e, i) => {
                  const exInfo = iconFor(e.n);
                  const isHeader = e.s === "—";
                  return (
                    <React.Fragment key={i}>
                      <tr>
                        <td style={{ width: 36, paddingRight: 0 }}>
                          {exInfo && !isHeader ? (
                            <button
                              className={`btp-ex-icon-btn ${
                                openInfo[i] ? "active" : ""
                              }`}
                              onClick={() => toggleInfo(i)}
                              title="Ver execução"
                              style={{ color: catColor }}
                            >
                              <SvgFromString
                                html={exInfo.svg}
                                color={catColor}
                                size={24}
                              />
                            </button>
                          ) : (
                            <span style={{ display: "inline-block", width: 32 }} />
                          )}
                        </td>
                        <td>
                          <span className="btp-exercise-num">
                            {isHeader ? "" : i + 1}
                          </span>
                        </td>
                        <td
                          style={{
                            fontWeight: isHeader ? 600 : 400,
                            color: isHeader
                              ? "var(--text-secondary)"
                              : "var(--text-primary)",
                          }}
                        >
                          {e.n}
                        </td>
                        <td>{e.s}</td>
                        <td>{e.r}</td>
                        <td>{e.c}</td>
                        <td>{e.rest}</td>
                      </tr>
                      {exInfo && openInfo[i] && (
                        <tr className="btp-ex-info-row">
                          <td colSpan={7}>
                            <div className="btp-ex-info-inner">
                              <div
                                className="btp-ex-info-svg"
                                style={{ borderColor: catColor + "33" }}
                              >
                                <SvgFromString
                                  html={exInfo.svg}
                                  color={catColor}
                                  size={76}
                                />
                              </div>
                              <div className="btp-ex-info-text">
                                <div className="btp-ex-info-desc">
                                  {exInfo.desc}
                                </div>
                                <div className="btp-ex-info-muscles">
                                  <strong>Músculos:</strong> {exInfo.muscles}
                                </div>
                                <div className="btp-ex-info-tech">
                                  <strong>Execução:</strong> {exInfo.tech}
                                </div>
                                <div
                                  className="btp-ex-info-cue"
                                  style={{ color: catColor }}
                                >
                                  Dica: {exInfo.cue}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="btp-section">
          <div className="btp-section-title">Progressão — 4 Semanas</div>
          <div className="btp-prog-grid">
            {plan.prog.map((w) => (
              <div key={w.w} className="btp-prog-week">
                <div className="btp-prog-week-num">Semana {w.w}</div>
                <div className="btp-prog-week-focus">{w.focus}</div>
                <div className="btp-prog-week-detail">{w.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="btp-footer-note">
          Planilha gerada pelo Banco de Treinos Profissional — Instituto Gallo
          Personal
          {ptName && ` | Personal: ${ptName}`}
          {studentName && ` | Aluno: ${studentName}`}
        </div>
      </div>
    </div>
  );
}

export default function BancoDeTreinos() {
  const [cat, setCat] = useState("all");
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="btp-root">
      <div className="btp-app">
        <Sidebar
          cat={cat}
          setCat={(c) => {
            setCat(c);
            setPlan(null);
          }}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        {plan ? (
          <PlanView
            plan={plan}
            onBack={() => setPlan(null)}
            setSidebarOpen={setSidebarOpen}
          />
        ) : (
          <HomeView
            cat={cat}
            search={search}
            setSearch={setSearch}
            onOpen={setPlan}
            setSidebarOpen={setSidebarOpen}
          />
        )}
      </div>
    </div>
  );
}
