-- =============================================================
-- 本番用Seed: スコアリング設定 / 設問27問 / 初期ベンチマーク
-- SupabaseダッシュボードのSQL Editorに貼り付けて実行する。
-- (ローカル開発用のデモユーザー・デモ企業は含まない)
-- =============================================================

insert into scoring_config (id) values (1) on conflict do nothing;

-- ---------- 設問27問 ----------
insert into questions (category, text, scale_type, is_reversed, sort_order, version) values
-- 1. AIリテラシー
('literacy', '生成AI(ChatGPTなど)がどのような仕組みで回答を作っているか、概要を人に説明できる', 'agreement', false, 1, 1),
('literacy', '目的に応じて複数のAIツール(文章生成・画像生成・検索型など)を使い分けられる', 'agreement', false, 2, 1),
('literacy', '欲しい回答を得るために、AIへの指示文(プロンプト)を自分なりに工夫して書ける', 'agreement', false, 3, 1),
('literacy', 'AIの回答には誤りが含まれる可能性があることを理解し、重要な内容は自分で確認・検証している', 'agreement', false, 4, 1),
('literacy', 'AIの新しいツールや機能に関する情報を、自分から進んで収集している', 'agreement', false, 5, 1),
-- 2. 業務活用度
('usage', '業務でAI(生成AIツール)を使う頻度はどのくらいですか', 'frequency', false, 6, 1),
('usage', '文章作成・要約・翻訳・調査など、複数の種類の業務でAIを活用している', 'agreement', false, 7, 1),
('usage', 'AIの活用によって、業務時間の短縮や成果物の品質向上を実感している', 'agreement', false, 8, 1),
('usage', '定型業務だけでなく、企画やアイデア出しなど考える業務にもAIを使っている', 'agreement', false, 9, 1),
('usage', 'AIを使った自分なりの仕事の進め方(手順やお決まりのプロンプト)ができている', 'agreement', false, 10, 1),
-- 3. 組織推進度
('org_drive', '経営層が、AI活用の方針やビジョンを明確に発信している', 'agreement', false, 11, 1),
('org_drive', '会社として、AIツールの導入・利用に必要な投資(予算・有料ライセンス)を行っている', 'agreement', false, 12, 1),
('org_drive', '社内に、AI活用を推進する担当者やチームが存在する', 'agreement', false, 13, 1),
('org_drive', 'AIの使い方を学べる研修や学習機会が、会社から提供されている', 'agreement', false, 14, 1),
-- 4. 浸透度
('culture', '自分の部署では、多くのメンバーが日常的にAIを活用している', 'agreement', false, 15, 1),
('culture', '同僚とAIの使い方やプロンプトを教え合う・共有する文化がある', 'agreement', false, 16, 1),
('culture', '社内でAI活用の成功事例が共有され、他の部署にも広がっている', 'agreement', false, 17, 1),
('culture', '業務で困りごとがあったとき、「AIで解決できないか」という発想が自然に出る', 'agreement', false, 18, 1),
-- 5. マインド・受容性
('mindset', 'AIに業務の一部を任せることに、不安よりも期待を感じる', 'agreement', false, 19, 1),
('mindset', 'AIの新しい使い方を試してみることに前向きである', 'agreement', false, 20, 1),
('mindset', 'AIスキルを身につけるための学習時間を、自分から確保している', 'agreement', false, 21, 1),
('mindset', 'AIによって自分の仕事が奪われるのではないかという不安を感じる', 'agreement', true, 22, 1),
('mindset', '「AIを使うより自分でやったほうが早い」と感じて、AIを使うのを避けることが多い', 'agreement', true, 23, 1),
-- 6. ガバナンス・セキュリティ
('governance', '会社に、AI利用に関するルールやガイドラインが整備されている', 'agreement', false, 24, 1),
('governance', '会社のAI利用ルールの内容を理解し、守って利用できている', 'agreement', false, 25, 1),
('governance', '機密情報や個人情報をAIに入力してはいけない場面を、自分で判断できる', 'agreement', false, 26, 1),
('governance', '情報漏えいなどの心配をせず、安心してAIを使える環境が会社に整っている', 'agreement', false, 27, 1);

-- ---------- 初期ベンチマーク(理論分布 seed: mean 55 / sd 15 / n 100) ----------
insert into benchmarks (category, industry, size_band, mean, sd, n, source)
select cat, ind, sz, 55, 15, 100, 'seed'
from unnest(array['literacy','usage','org_drive','culture','mindset','governance','total']) cat,
     unnest(array['all','manufacturing','construction_realestate','it_telecom','finance_insurance',
                  'retail_wholesale','medical_welfare','education','transport_logistics',
                  'food_hospitality','professional_services','public','other']) ind,
     unnest(array['all','s1_10','s11_50','s51_100','s101_300','s301_1000','s1001_']) sz
where ind = 'all' or sz = 'all'   -- 全国 + 業種別 + 規模別(業種×規模は実データ蓄積後)
on conflict (category, industry, size_band) do nothing;
