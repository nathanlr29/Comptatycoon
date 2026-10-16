import type { BuildingType } from './buildings';
import type { StaffRole } from './staff';

/** Équipements, logiciels, technologies, formations et certifications à achat unique (docs/GDD.md §3 bis). */
export type UpgradeId =
  | 'dualScreen'
  | 'scanner'
  | 'internTraining1'
  | 'keyboardShortcuts'
  | 'ocr'
  | 'juniorTraining1'
  | 'ergoChairs'
  | 'ebics'
  | 'internTraining2'
  | 'edi'
  | 'qualityCharter'
  | 'taxSoftware'
  | 'einvoicing'
  | 'reviewSoftware'
  | 'automation'
  | 'seniorTraining1'
  | 'precompta'
  | 'juniorTraining2'
  | 'ged'
  | 'internTraining3'
  | 'mobileCapture'
  | 'cloudSecurity'
  | 'dashboards'
  | 'iso9001'
  | 'aiAssistant'
  | 'managerTraining1'
  | 'seniorTraining2'
  | 'juniorTraining3'
  | 'csrLabel'
  | 'consolidation'
  | 'iso27001'
  | 'managerTraining2'
  | 'seniorTraining3'
  | 'aiAgents'
  | 'nationalAward'
  | 'managerTraining3';

/** Rubriques de l'onglet « Améliorations », dans l'ordre d'affichage. */
export type UpgradeCategory = 'equipment' | 'software' | 'tech' | 'training' | 'certification';

export const UPGRADE_CATEGORIES: { id: UpgradeCategory; label: string }[] = [
  { id: 'equipment', label: 'Équipement' },
  { id: 'software', label: 'Logiciels' },
  { id: 'tech', label: 'Technologies (Salle serveurs)' },
  { id: 'training', label: 'Formations' },
  { id: 'certification', label: 'Certifications et labels' },
];

/** Effets multiplicatifs d'une amélioration ; un champ absent vaut ×1. */
export interface UpgradeEffect {
  click?: number;
  /** Part du revenu/s ajoutée à chaque clic ; les parts s'additionnent. */
  clickIncomeShare?: number;
  global?: number;
  roles?: Partial<Record<StaffRole, number>>;
}

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  description: string;
  cost: number;
  category: UpgradeCategory;
  effect: UpgradeEffect;
  /** Texte court de l'effet, affiché sous la description. */
  effectText: string;
  requires?: UpgradeId;
  minReputation?: number;
  /** Pièce aménagée au niveau voulu (travaux terminés). */
  requiresBuilding?: { type: BuildingType; level: number };
  /** Réputation gagnée une fois, à l'achat. */
  reputationGain?: number;
  /** Palier d'une série : à partir du 2ᵉ, la ligne n'apparaît qu'une fois le palier précédent (`requires`) acquis. */
  tier?: number;
}

type Def = Omit<UpgradeDefinition, 'id'>;
const SERVER = (level: number) => ({ type: 'serverRoom' as const, level });

/** Dans l'ordre de coût croissant (l'onglet les regroupe ensuite par rubrique). */
const CATALOG: Record<UpgradeId, Def> = {
  dualScreen: { name: 'Double écran', description: 'Saisie deux fois plus rapide.', cost: 50, category: 'equipment', effect: { click: 2, clickIncomeShare: 0.01 }, effectText: 'Saisie × 2 · chaque clic + 1 % du revenu/s' },
  scanner: { name: 'Scanner de documents', description: 'Les pièces papier sont numérisées en un seul passage.', cost: 150, category: 'equipment', effect: { roles: { intern: 2 } }, effectText: 'Alternants × 2' },
  internTraining1: { name: 'Formation tableur', description: 'Tableaux croisés et RECHERCHEV : les alternants ne recopient plus à la main.', cost: 300, category: 'training', tier: 1, effect: { roles: { intern: 1.5 } }, effectText: 'Alternants × 1,5' },
  keyboardShortcuts: { name: 'Raccourcis clavier', description: 'Plus besoin de la souris : saisie doublée.', cost: 500, category: 'equipment', effect: { click: 2, clickIncomeShare: 0.01 }, effectText: 'Saisie × 2 · chaque clic + 1 % du revenu/s' },
  ocr: { name: 'Logiciel OCR', description: 'Les factures scannées sont lues et pré-saisies automatiquement.', cost: 2_000, category: 'software', effect: { click: 3, clickIncomeShare: 0.02 }, effectText: 'Saisie × 3 · chaque clic + 2 % du revenu/s', requires: 'scanner' },
  juniorTraining1: { name: 'Formation TVA', description: 'Taux, autoliquidation, régimes : plus une déclaration à reprendre.', cost: 2_500, category: 'training', tier: 1, effect: { roles: { junior: 1.5 } }, effectText: 'Juniors × 1,5' },
  ergoChairs: { name: 'Sièges ergonomiques', description: 'Moins de dos bloqués en période fiscale, plus de dossiers bouclés.', cost: 3_000, category: 'equipment', effect: { global: 1.05 }, effectText: 'Production + 5 %' },
  ebics: { name: 'Connexion bancaire EBICS', description: 'Les relevés des clients arrivent seuls chaque matin : rapprochement bancaire express.', cost: 4_000, category: 'software', effect: { roles: { junior: 2 } }, effectText: 'Juniors × 2' },
  internTraining2: { name: 'Formation au logiciel comptable', description: 'Lettrage, rapprochement, imports : les alternants deviennent autonomes.', cost: 5_000, category: 'training', tier: 2, requires: 'internTraining1', effect: { roles: { intern: 1.5 } }, effectText: 'Alternants × 1,5' },
  edi: { name: 'Télétransmission EDI', description: 'Liasses et déclarations envoyées aux impôts en un clic.', cost: 8_000, category: 'software', effect: { global: 1.1 }, effectText: 'Production + 10 %' },
  qualityCharter: { name: 'Charte qualité du cabinet', description: 'Lettres de mission, check-lists de clôture, revue par un associé.', cost: 10_000, category: 'certification', minReputation: 5, reputationGain: 3, effect: { global: 1.05 }, effectText: 'Production + 5 % · + 3 réputation' },
  taxSoftware: { name: 'Logiciel de liasse fiscale', description: 'La liasse se remplit depuis la balance et part directement par EDI.', cost: 11_000, category: 'software', requires: 'edi', effect: { roles: { senior: 1.5 } }, effectText: 'Seniors × 1,5' },
  einvoicing: { name: 'Facture électronique', description: 'Les factures arrivent déjà structurées par la plateforme de dématérialisation.', cost: 12_000, category: 'software', effect: { roles: { intern: 1.5, junior: 1.5 } }, effectText: 'Alternants et juniors × 1,5', requires: 'ocr' },
  reviewSoftware: { name: 'Logiciel de révision', description: 'Dossiers de travail et contrôles de cohérence automatiques.', cost: 20_000, category: 'software', effect: { roles: { senior: 2 } }, effectText: 'Seniors × 2', minReputation: 5 },
  automation: { name: 'Automatisation de la saisie', description: 'Les écritures récurrentes sont passées par des règles, la nuit, sur vos serveurs.', cost: 25_000, category: 'tech', requires: 'ocr', requiresBuilding: SERVER(1), effect: { roles: { intern: 2, junior: 2 } }, effectText: 'Alternants et juniors × 2' },
  seniorTraining1: { name: 'Formation révision et contrôle interne', description: 'Approche par les risques : les seniors vont droit aux comptes sensibles.', cost: 30_000, category: 'training', tier: 1, minReputation: 5, effect: { roles: { senior: 1.5 } }, effectText: 'Seniors × 1,5' },
  precompta: { name: 'Plateforme de pré-comptabilité en ligne', description: 'Banque, factures et justificatifs synchronisés : les écritures se proposent seules.', cost: 35_000, category: 'software', requires: 'ebics', effect: { roles: { junior: 1.5, senior: 1.25 } }, effectText: 'Juniors × 1,5 · seniors × 1,25' },
  juniorTraining2: { name: 'Formation clôture des comptes annuels', description: 'Cut-off, provisions, stocks : les juniors montent leurs premiers bilans.', cost: 40_000, category: 'training', tier: 2, requires: 'juniorTraining1', effect: { roles: { junior: 1.5 } }, effectText: 'Juniors × 1,5' },
  ged: { name: 'GED et portail client', description: 'Les clients déposent leurs pièces en ligne, tout est classé et retrouvé.', cost: 60_000, category: 'software', effect: { global: 1.25 }, effectText: 'Production + 25 %', requires: 'einvoicing' },
  internTraining3: { name: 'Tutorat par les seniors', description: 'Chaque alternant a son tuteur : il sort de son contrat prêt à être embauché.', cost: 65_000, category: 'training', tier: 3, requires: 'internTraining2', effect: { roles: { intern: 2 } }, effectText: 'Alternants × 2' },
  mobileCapture: { name: 'Application de saisie mobile', description: 'Notes de frais et factures photographiées par les clients, saisies en un geste.', cost: 75_000, category: 'software', effect: { click: 2, clickIncomeShare: 0.03 }, effectText: 'Saisie × 2 · chaque clic + 3 % du revenu/s', requires: 'ocr' },
  cloudSecurity: { name: 'Sauvegarde cloud et cybersécurité', description: 'Double authentification, sauvegardes chiffrées : plus une journée perdue.', cost: 100_000, category: 'tech', requiresBuilding: SERVER(2), effect: { global: 1.15 }, effectText: 'Production + 15 %' },
  dashboards: { name: 'Tableaux de bord clients', description: 'Indicateurs en temps réel pour piloter chaque portefeuille.', cost: 150_000, category: 'software', effect: { roles: { manager: 2 } }, effectText: 'Managers × 2', minReputation: 20 },
  iso9001: { name: 'Certification ISO 9001', description: 'Processus écrits et audités : les grands comptes vous font confiance.', cost: 180_000, category: 'certification', requires: 'qualityCharter', minReputation: 25, reputationGain: 5, effect: { global: 1.15 }, effectText: 'Production + 15 % · + 5 réputation' },
  aiAssistant: { name: 'Assistant comptable IA', description: 'Il propose les imputations, repère les anomalies et prépare les relances.', cost: 250_000, category: 'tech', requires: 'automation', requiresBuilding: SERVER(3), effect: { global: 1.5, clickIncomeShare: 0.05 }, effectText: 'Production × 1,5 · chaque clic + 5 % du revenu/s' },
  managerTraining1: { name: 'Formation management d’équipe', description: 'Entretiens annuels, délégation, plannings : les équipes tournent sans heurts.', cost: 280_000, category: 'training', tier: 1, minReputation: 20, effect: { roles: { manager: 1.5 } }, effectText: 'Managers × 1,5' },
  seniorTraining2: { name: 'Formation consolidation et normes IFRS', description: 'Groupes, filiales, retraitements : les seniors prennent les gros dossiers.', cost: 400_000, category: 'training', tier: 2, requires: 'seniorTraining1', effect: { roles: { senior: 1.5 } }, effectText: 'Seniors × 1,5' },
  juniorTraining3: { name: 'Formation fiscalité des entreprises', description: 'Intégration fiscale, crédits d’impôt : les juniors conseillent déjà.', cost: 500_000, category: 'training', tier: 3, requires: 'juniorTraining2', effect: { roles: { junior: 2 } }, effectText: 'Juniors × 2' },
  csrLabel: { name: 'Label RSE du cabinet', description: 'Bilan carbone, égalité, télétravail : les talents et les clients suivent.', cost: 800_000, category: 'certification', requires: 'iso9001', minReputation: 40, reputationGain: 8, effect: { global: 1.2 }, effectText: 'Production + 20 % · + 8 réputation' },
  consolidation: { name: 'Logiciel de consolidation de groupe', description: 'Comptes consolidés de dizaines de filiales, éliminations automatiques.', cost: 1_200_000, category: 'software', requires: 'dashboards', minReputation: 50, effect: { roles: { manager: 2 } }, effectText: 'Managers × 2' },
  iso27001: { name: 'Certification ISO 27001', description: 'Sécurité de l’information certifiée : banques et groupes cotés vous confient leurs données.', cost: 2_500_000, category: 'certification', requires: 'cloudSecurity', minReputation: 60, reputationGain: 10, effect: { global: 1.25 }, effectText: 'Production + 25 % · + 10 réputation' },
  managerTraining2: { name: 'Formation pilotage de la relation client', description: 'Lettres de mission revues, honoraires négociés, clients fidélisés.', cost: 4_000_000, category: 'training', tier: 2, requires: 'managerTraining1', effect: { roles: { manager: 1.5 } }, effectText: 'Managers × 1,5' },
  seniorTraining3: { name: 'Diplôme d’expertise comptable financé', description: 'Vos seniors passent le DEC : ils signent bientôt eux-mêmes.', cost: 5_000_000, category: 'training', tier: 3, requires: 'seniorTraining2', effect: { roles: { senior: 2 } }, effectText: 'Seniors × 2' },
  aiAgents: { name: 'Agents IA de révision', description: 'Des agents révisent les comptes la nuit et laissent aux équipes un dossier prêt à valider.', cost: 8_000_000, category: 'tech', requires: 'aiAssistant', minReputation: 80, effect: { roles: { senior: 2, manager: 2 } }, effectText: 'Seniors et managers × 2' },
  nationalAward: { name: 'Trophée national de l’expertise comptable', description: 'Le cabinet de l’année : la presse spécialisée ne parle que de vous.', cost: 25_000_000, category: 'certification', requires: 'csrLabel', minReputation: 100, reputationGain: 15, effect: { global: 1.5 }, effectText: 'Production × 1,5 · + 15 réputation' },
  managerTraining3: { name: 'Executive MBA', description: 'Stratégie, finance d’entreprise, leadership : vos managers pensent en associés.', cost: 50_000_000, category: 'training', tier: 3, requires: 'managerTraining2', effect: { roles: { manager: 2 } }, effectText: 'Managers × 2' },
};

export const UPGRADES = Object.fromEntries(Object.entries(CATALOG).map(([id, def]) => [id, { id, ...def }])) as Record<UpgradeId, UpgradeDefinition>;
export const UPGRADE_IDS = Object.keys(CATALOG) as UpgradeId[];
