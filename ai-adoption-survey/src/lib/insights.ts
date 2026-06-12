import { SERVICES, type ServiceDef, type CategoryKey } from "./constants";
import { rankLabel, topPercent } from "./scoring";

/**
 * 診断コメント生成エンジン。
 * 偏差値に応じてトーンを切り替える:
 *  - 45未満: 危機感(放置リスクを具体的に)
 *  - 45〜55: 分水嶺(平均で満足させない)
 *  - 55以上: 意欲喚起(次のステージへ)
 */

export type Tone = "crisis" | "push" | "lead";

export function toneOf(deviation: number): Tone {
  if (deviation < 45) return "crisis";
  if (deviation < 55) return "push";
  return "lead";
}

type CategoryText = { crisis: string; push: string; lead: string };

const CATEGORY_INSIGHTS: Record<CategoryKey, CategoryText> = {
  literacy: {
    crisis:
      "社員の多くがAIの基本操作・プロンプト設計でつまずいている状態です。この層を放置すると、ツールを導入しても使われない「ライセンスの空回り」が起き、投資が回収できません。全社一律の底上げ研修が最優先です。",
    push:
      "基本操作はできる社員が増えつつありますが、「目的に応じたツールの使い分け」「精度を引き出すプロンプト設計」まで到達している層はまだ一部です。ここを超えると業務成果に直結し始めます。",
    lead:
      "リテラシーは全国上位圏です。次は知識を「業務の型」に変換するフェーズ — 部署別のユースケース標準化や、社内講師の育成で組織資産化を進めましょう。",
  },
  usage: {
    crisis:
      "AIが日常業務にほとんど組み込まれていません。生成AIを使いこなす企業では1人あたり月30〜40時間の業務削減が報告されており、この差は毎月複利のように開いていきます。「週1回でも使う」習慣づくりから着手が必要です。",
    push:
      "一部の業務では使われ始めていますが、文書作成など定型用途に偏っており、企画・分析など付加価値の高い業務への適用はこれからです。活用範囲を広げた企業との生産性格差が出始めるラインにいます。",
    lead:
      "業務活用は全国上位圏。すでに「使う」段階は卒業しつつあります。次は業務フローそのものをAI前提で再設計し、自動化・内製開発で投資対効果を一段引き上げる段階です。",
  },
  org_drive: {
    crisis:
      "経営層の発信・投資・推進体制が社員に届いていません。トップのコミットがない組織ではAI活用は個人の趣味レベルで止まり、セキュリティ事故のリスクだけが残ります。経営アジェンダへの格上げが急務です。",
    push:
      "推進の意思はあるものの、体制・予算・ロードマップの「見える化」が道半ばです。推進担当の専任化と、四半期単位の目標設定で一気に前進できるポジションにいます。",
    lead:
      "経営のコミットと推進体制は全国上位圏です。この推進力を「現場の自走」につなげるため、部署別KPIの設定と成功事例の横展開サイクルを仕組み化しましょう。",
  },
  culture: {
    crisis:
      "AI活用が一部の個人に閉じており、ノウハウが組織に蓄積されていません。属人化したまま担当者が異動・退職すれば振り出しに戻ります。共有の場と事例ストックの仕組みづくりが必要です。",
    push:
      "部署内での共有は生まれつつありますが、部署を越えた展開はこれからです。「あの部署はこう使っている」が見える状態をつくると、浸透は加速度的に進みます。",
    lead:
      "共有文化は全国上位圏。プロンプトや事例が自然に流通する貴重な土壌があります。コミュニティ運営を公式化し、ボトムアップの改善提案をAI開発テーマに昇華させましょう。",
  },
  mindset: {
    crisis:
      "AIへの不安・抵抗感が活用のブレーキになっています。不安の多くは「触ったことがない」ことに起因します。小さな成功体験を意図的に設計しないと、ツールも研修も空振りに終わります。",
    push:
      "前向きな社員と様子見の社員が混在しています。様子見層は「周囲が使い始めた」事実で一気に動きます。アーリー層の成功体験を可視化して波及させる好機です。",
    lead:
      "変化への前向きさは全国上位圏。社員の意欲が投資を上回るスピードで高まっている状態です。意欲の受け皿として、より高度な学習機会と挑戦テーマを用意しましょう。",
  },
  governance: {
    crisis:
      "利用ルールが未整備または周知されておらず、情報漏えい・誤情報利用のリスクに無防備な状態です。事故が起きてからの後追い規制は活用そのものを止めてしまいます。ガイドライン整備は活用推進とセットで最優先です。",
    push:
      "ルールはあるものの「現場が理解して使いこなせている」状態までは届いていません。ルールの存在と安心して使える環境はセットです。理解度テストや研修での定着が次の一手です。",
    lead:
      "ガバナンスは全国上位圏。「安心して使える環境」という攻めの土台が整っています。この信頼を武器に、顧客データを扱う基幹業務への適用範囲拡大を検討できる段階です。",
  },
};

export function categoryInsight(key: CategoryKey, deviation: number): string {
  return CATEGORY_INSIGHTS[key][toneOf(deviation)];
}

export function overallInsight(params: {
  totalDeviation: number;
  industryLabel: string;
  level: { level: number; name: string };
}): { tone: Tone; headline: string; body: string } {
  const { totalDeviation, industryLabel, level } = params;
  const tone = toneOf(totalDeviation);
  const pct = topPercent(totalDeviation);

  if (tone === "crisis") {
    return {
      tone,
      headline: `警告: 貴社のAI活用は全国の下位グループに位置しています`,
      body:
        `総合偏差値${totalDeviation.toFixed(1)}は、全国の${industryLabel}の中で下位${100 - pct}%圏です。` +
        `生成AIの業務活用はすでに「使うかどうか」ではなく「どれだけ差が開くか」の段階に入っており、先行企業は1人あたり月30時間超の業務削減を実現しています。` +
        `現在のレベル(Lv.${level.level} ${level.name})のまま1年経過すると、生産性だけでなく採用市場・取引先からの評価でも不利が固定化しかねません。` +
        `まずは全社のリテラシー底上げと利用ルール整備を、経営アジェンダとして今期中に着手することを強く推奨します。`,
    };
  }
  if (tone === "push") {
    return {
      tone,
      headline: `全国平均圏 — ここからの1年が「上位組」との分水嶺です`,
      body:
        `総合偏差値${totalDeviation.toFixed(1)}で、全国の${industryLabel}のほぼ平均圏(${rankLabel(totalDeviation).text})にいます。` +
        `ただし注意が必要なのは、上位2割の企業はすでに「全員が使う」を超えて業務自動化・AI内製開発へ駒を進めていることです。` +
        `平均圏は安全圏ではなく、最も差がつきやすいポジションです。強みのカテゴリーを推進エンジンに、弱みのカテゴリーへ計画的に投資すれば、1年で上位群への到達は十分可能です。`,
    };
  }
  return {
    tone,
    headline: `全国上位${pct}% — 次の差別化は「使う」から「創る」へ`,
    body:
      `総合偏差値${totalDeviation.toFixed(1)}は全国の${industryLabel}の上位${pct}%にあたる先進グループです。` +
      `この水準の企業が次に取り組むべきは、AIを「使う」段階から「業務に合わせて創る」段階への移行 — すなわち業務フローの自動化とAI内製開発です。` +
      `現場の活用力という土台があるいまこそ、Claude Code等による内製化・ミニアプリ開発で投資対効果を最大化する好機です。`,
  };
}

/**
 * レベル駆動のサービス推奨。
 * Lv.1-2(顧客層の大多数) → 法人リスキリングが主軸
 * Lv.3(停滞圏を抜けた少数派) → Claude Code導入支援が主軸
 * Lv.4-5(先進企業) → エージェント構築・AI開発実装支援が主軸
 */
export function recommendServices(params: {
  level: number;
  categories: { key: string; deviation: number | null }[];
}): { service: ServiceDef; reason: string }[] {
  const { level, categories } = params;
  const dev = (k: string) =>
    categories.find((c) => c.key === k)?.deviation ?? 50;
  const orgWeak = Math.min(dev("org_drive"), dev("culture"), dev("governance"));

  if (level <= 2) {
    return [
      {
        service: SERVICES.reskilling,
        reason:
          "貴社は多くの企業が停滞するレベル1・2の圏内です。ここからの脱出には、一部の得意な社員に頼るのではなく「全社員が使える状態」をつくる底上げが最優先。業務棚卸し×研修×6ヶ月伴走が最短ルートです。",
      },
      {
        service: SERVICES.consulting,
        reason:
          orgWeak < 50
            ? "推進体制・利用ルールが未整備のまま研修だけ行っても定着しません。ガイドライン整備と推進の仕組みづくりを並走させることで、研修効果が全社に波及します。"
            : "研修と並行して活用ガイドラインと推進体制を磨き込むと、レベル3(組織活用)への到達速度が大きく変わります。",
      },
    ];
  }
  if (level === 3) {
    return [
      {
        service: SERVICES.claudecode,
        reason:
          "業務ツール連携(レベル3)まで到達した貴社の次の一手は、Claude Codeによるワークフロー自動化(レベル4)。この段階の企業が最も投資対効果を出しやすい領域で、先行企業はすでに踏み出しています。",
      },
      {
        service: SERVICES.consulting,
        reason:
          "「どの業務から自動化するか」の棚卸しと優先度設計を専任チームが伴走。自動化テーマを確実に成果へつなげます。",
      },
    ];
  }
  return [
    {
      service: SERVICES.consulting,
      reason:
        "レベル4以上の貴社は、AIエージェント構築・AI開発実装で事業価値を創る段階です。実装から定着まで専任チームが伴走し、本格開発(レベル5)への移行を支援します。",
    },
    {
      service: SERVICES.claudecode,
      reason:
        "全社のClaude Code活用力をさらに底上げし、内製開発体制を確立。研修からミニアプリ納品まで、フェーズに合わせて加速させます。",
    },
  ];
}
