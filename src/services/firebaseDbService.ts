import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  Firestore,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  initializeFirestore,
  limit,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  CashFlowMovement,
  CashShift,
  CashShiftRecord,
  DepotSettings,
  Motoboy,
  Order,
  OrderMessage,
  Product,
  StaffAccount,
  StockMovement,
  TableTab,
  VasilhameControl,
} from '../types';

const STORE_DOC_ID = 'main';
export const STAFF_SYNTHETIC_DOMAIN = 'equipe.gelafacil.app';

let activeStoreOwnerUid = '';
let activeStoreOwnerEmail = '';
let activeStaffUids: string[] = [];

export function getActiveStoreOwnerUid(): string {
  return activeStoreOwnerUid;
}

export function getActiveStoreOwnerEmail(): string {
  return activeStoreOwnerEmail;
}

export function getActiveStaffUids(): string[] {
  return activeStaffUids;
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

function createFirestoreInstance(): Firestore {
  try {
    return initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
}

export const db = createFirestoreInstance();
export const firebaseAuth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: firebaseAuth.currentUser?.uid,
      email: firebaseAuth.currentUser?.email,
      emailVerified: firebaseAuth.currentUser?.emailVerified,
      isAnonymous: firebaseAuth.currentUser?.isAnonymous,
      tenantId: firebaseAuth.currentUser?.tenantId,
      providerInfo:
        firebaseAuth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return false;
    }
    return true;
  }
}

// =========================================================================
// AUTHENTICAÇÃO GOOGLE PARA NUVEM (QUALQUER E-MAIL DO DONO, EQUIPE E CLIENTE)
// =========================================================================
export async function signInWithGoogleForCloud(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(firebaseAuth, provider);
  return result.user;
}

export async function signOutCloudAuth(): Promise<void> {
  await signOut(firebaseAuth);
}

export function subscribeCloudAuth(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(firebaseAuth, cb);
}

export function normalizeStaffUsername(raw: string): string {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_\-]/g, '')
    .slice(0, 32);
}

export function usernameToSyntheticEmail(username: string): string {
  const norm = normalizeStaffUsername(username);
  return `${norm}@${STAFF_SYNTHETIC_DOMAIN}`;
}

export function isSyntheticStaffEmail(email?: string | null): boolean {
  return Boolean(email && email.trim().toLowerCase().endsWith(`@${STAFF_SYNTHETIC_DOMAIN}`));
}

export function isCurrentUserOwner(user: User | null = firebaseAuth.currentUser): boolean {
  return Boolean(
    user?.emailVerified &&
      !isSyntheticStaffEmail(user.email) &&
      activeStoreOwnerUid &&
      user.uid === activeStoreOwnerUid
  );
}

export function canPerformCloudStaffWrite(user: User | null = firebaseAuth.currentUser): boolean {
  if (!user) return false;
  return Boolean(user.emailVerified || isSyntheticStaffEmail(user.email));
}

export function sanitizeStaffEmails(emails?: string[], ownerEmailToExclude?: string): string[] {
  if (!Array.isArray(emails)) return [];
  const excluded = (ownerEmailToExclude || activeStoreOwnerEmail || '').trim().toLowerCase();
  const unique = new Set<string>();
  for (const raw of emails) {
    const clean = String(raw || '').trim().toLowerCase();
    if (
      clean &&
      clean !== excluded &&
      clean.length >= 5 &&
      clean.length <= 120 &&
      /^[^\s/]+@[^\s/]+\.[^\s/]+$/.test(clean)
    ) {
      unique.add(clean);
      if (unique.size >= 10) break;
    }
  }
  return Array.from(unique);
}

export function sanitizeStaffUids(uids?: string[]): string[] {
  if (!Array.isArray(uids)) return [];
  const unique = new Set<string>();
  for (const raw of uids) {
    const clean = safeStr(raw, 128, '').trim();
    if (clean) {
      unique.add(clean);
      if (unique.size >= 20) break;
    }
  }
  return Array.from(unique);
}

async function fetchPublicStoreOwnerUid(): Promise<string> {
  try {
    let snap;
    try {
      snap = await getDocFromServer(doc(db, 'storePublic', STORE_DOC_ID));
    } catch {
      snap = await getDoc(doc(db, 'storePublic', STORE_DOC_ID));
    }
    if (snap.exists()) {
      const data = snap.data();
      const uid = safeStr(data?.ownerUid, 128, '');
      if (Array.isArray(data?.activeStaffUids)) {
        activeStaffUids = sanitizeStaffUids(data.activeStaffUids as string[]);
      }
      if (uid) {
        activeStoreOwnerUid = uid;
        return uid;
      }
    }
  } catch {
    // ignore offline/read issue
  }
  return activeStoreOwnerUid;
}

export interface FullStoreCloudBundle {
  products: Product[];
  vasilhames: VasilhameControl[];
  motoboys: Motoboy[];
  orders: Order[];
  tables: TableTab[];
  cashShift: CashShift;
  shiftHistory: CashShiftRecord[];
  cashFlows: CashFlowMovement[];
  settings: DepotSettings;
}

export interface CloudRoleStatus {
  isOwner: boolean;
  isAuthorizedStaff: boolean;
  role?: 'DONO' | 'BALCAO' | 'MOTOBOY';
  storeClaimed: boolean;
  staffUid?: string;
  staffUsername?: string;
  staffDisplayName?: string;
  motoboyId?: string;
}

export async function claimStoreOwnershipInCloud(bundle: FullStoreCloudBundle): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!user || !user.emailVerified || !user.email || isSyntheticStaffEmail(user.email)) {
    throw new Error('Conecte uma conta Google verificada para ativar a loja na nuvem.');
  }

  const userEmail = user.email.trim().toLowerCase();
  const existingOwner = await fetchPublicStoreOwnerUid();
  if (existingOwner && existingOwner !== user.uid) {
    throw new Error('Esta loja já possui um Dono principal cadastrado na nuvem.');
  }

  activeStoreOwnerUid = user.uid;
  activeStoreOwnerEmail = userEmail;

  const updatedSettings: DepotSettings = {
    ...bundle.settings,
    ownerEmail: bundle.settings.ownerEmail?.trim() ? bundle.settings.ownerEmail : userEmail,
    staffEmails: sanitizeStaffEmails(bundle.settings.staffEmails, userEmail),
    staffUids: sanitizeStaffUids(activeStaffUids),
  };

  await syncStoreSettingsToCloud(updatedSettings);
  await uploadFullLocalStoreToCloud({ ...bundle, settings: updatedSettings });
}

export async function resetStoreOwnershipInCloud(): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!user || !user.emailVerified || !isCurrentUserOwner(user)) {
    throw new Error('Apenas o Dono atual conectado pode liberar a loja para outro e-mail.');
  }

  try {
    await deleteDoc(doc(db, 'storeSettings', STORE_DOC_ID));
    await deleteDoc(doc(db, 'storePublic', STORE_DOC_ID));
    activeStoreOwnerUid = '';
    activeStoreOwnerEmail = '';
    activeStaffUids = [];
    await signOutCloudAuth();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `storeSettings/${STORE_DOC_ID}`);
  }
}

export async function checkUserStaffAuthorization(
  user: User | null,
  options?: { autoClaimIfUnclaimed?: boolean; bundleForClaim?: FullStoreCloudBundle }
): Promise<CloudRoleStatus> {
  if (!user || !user.email) {
    return { isOwner: false, isAuthorizedStaff: false, storeClaimed: Boolean(activeStoreOwnerUid) };
  }

  const email = user.email.trim().toLowerCase();
  const pubOwnerUid = await fetchPublicStoreOwnerUid();

  // 1. Staff user created by Owner with username + password
  if (isSyntheticStaffEmail(email)) {
    try {
      const snap = await getDoc(doc(db, 'staffAccounts', user.uid));
      if (snap.exists()) {
        const d = snap.data();
        if (d?.active === true && typeof d.storeOwnerUid === 'string' && d.storeOwnerUid) {
          activeStoreOwnerUid = safeStr(d.storeOwnerUid, 128, pubOwnerUid);
          return {
            isOwner: false,
            isAuthorizedStaff: true,
            role: (d.role as 'BALCAO' | 'MOTOBOY') || 'BALCAO',
            storeClaimed: true,
            staffUid: user.uid,
            staffUsername: safeStr(d.username, 32, email.split('@')[0] || ''),
            staffDisplayName: safeStr(d.displayName, 80, 'Equipe'),
            motoboyId: safeStr(d.motoboyId, 64, '') || undefined,
          };
        }
      }
    } catch {
      // Blocked or revoked
    }
    await signOut(firebaseAuth).catch(() => undefined);
    return { isOwner: false, isAuthorizedStaff: false, storeClaimed: Boolean(pubOwnerUid) };
  }

  // 2. Google-verified users (Owner, Google Staff, or Customer)
  if (!user.emailVerified) {
    return { isOwner: false, isAuthorizedStaff: false, storeClaimed: Boolean(pubOwnerUid) };
  }

  if (!pubOwnerUid) {
    if (options?.autoClaimIfUnclaimed && options?.bundleForClaim) {
      await claimStoreOwnershipInCloud(options.bundleForClaim);
      return { isOwner: true, isAuthorizedStaff: true, role: 'DONO', storeClaimed: true };
    }
    return { isOwner: false, isAuthorizedStaff: false, storeClaimed: false };
  }

  if (pubOwnerUid === user.uid) {
    activeStoreOwnerUid = user.uid;
    activeStoreOwnerEmail = email;
    return { isOwner: true, isAuthorizedStaff: true, role: 'DONO', storeClaimed: true };
  }

  try {
    const snap = await getDoc(doc(db, 'staffAccess', email));
    if (snap.exists()) {
      const data = snap.data();
      if (data?.active === true) {
        activeStoreOwnerUid = safeStr(data.storeOwnerUid, 128, pubOwnerUid);
        activeStoreOwnerEmail = safeStr(data.ownerEmail, 120, '');
        return {
          isOwner: false,
          isAuthorizedStaff: true,
          role: (data.role as 'BALCAO' | 'MOTOBOY') || 'BALCAO',
          storeClaimed: true,
        };
      }
    }
  } catch {
    // Usuário comum / não autorizado
  }

  return { isOwner: false, isAuthorizedStaff: false, storeClaimed: true };
}

function getSecondaryStaffCreatorAuth() {
  const existing = getApps().find((a) => a.name === 'staff-creator-app');
  const secondaryApp = existing || initializeApp(firebaseConfig, 'staff-creator-app');
  return getAuth(secondaryApp);
}

export async function signInStaffWithUsernameInCloud(
  rawUsername: string,
  password: string
): Promise<{ user: User; account: StaffAccount }> {
  const norm = normalizeStaffUsername(rawUsername);
  if (norm.length < 3) {
    throw new Error('Digite um usuário válido (mínimo 3 letras/números).');
  }
  if (!password) {
    throw new Error('Digite a senha do usuário.');
  }

  const syntheticEmail = usernameToSyntheticEmail(norm);
  let cred;
  try {
    cred = await signInWithEmailAndPassword(firebaseAuth, syntheticEmail, password);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('operation-not-allowed')) {
      throw new Error('AUTH_EMAIL_PASSWORD_DISABLED');
    }
    if (
      msg.includes('invalid-credential') ||
      msg.includes('wrong-password') ||
      msg.includes('user-not-found')
    ) {
      throw new Error('Usuário ou senha incorretos.');
    }
    throw new Error(msg);
  }

  await fetchPublicStoreOwnerUid();
  const snap = await getDoc(doc(db, 'staffAccounts', cred.user.uid));
  if (!snap.exists()) {
    await signOut(firebaseAuth).catch(() => undefined);
    throw new Error('Conta não vinculada a esta loja pelo Dono.');
  }

  const d = snap.data();
  if (d?.active !== true) {
    await signOut(firebaseAuth).catch(() => undefined);
    throw new Error('Este usuário foi bloqueado pelo Dono.');
  }

  activeStoreOwnerUid = safeStr(d.storeOwnerUid, 128, activeStoreOwnerUid);
  const account: StaffAccount = {
    uid: cred.user.uid,
    username: safeStr(d.username, 32, norm),
    displayName: safeStr(d.displayName, 80, norm),
    role: (d.role as 'BALCAO' | 'MOTOBOY') || 'BALCAO',
    motoboyId: safeStr(d.motoboyId, 64, '') || undefined,
    active: true,
    createdAt: toIsoString(d.createdAt),
  };
  return { user: cred.user, account };
}

export async function createStaffAccountInCloud(params: {
  username: string;
  displayName: string;
  password: string;
  role: 'BALCAO' | 'MOTOBOY';
  motoboyId?: string;
}): Promise<StaffAccount> {
  const owner = firebaseAuth.currentUser;
  if (!owner || !isCurrentUserOwner(owner)) {
    throw new Error('Conecte a conta Google do Dono para criar usuários da equipe na nuvem.');
  }

  const normUsername = normalizeStaffUsername(params.username);
  if (normUsername.length < 3) {
    throw new Error('O usuário precisa ter pelo menos 3 caracteres (letras, números ou -).');
  }
  if (!params.password || params.password.length < 6) {
    throw new Error('A senha do usuário na nuvem precisa ter pelo menos 6 caracteres.');
  }
  const cleanDisplayName = safeStr(params.displayName.trim() || normUsername, 80, normUsername);
  const syntheticEmail = usernameToSyntheticEmail(normUsername);

  const secondaryAuth = getSecondaryStaffCreatorAuth();
  let newUid = '';
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, syntheticEmail, params.password);
    newUid = cred.user.uid;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('operation-not-allowed')) {
      throw new Error('AUTH_EMAIL_PASSWORD_DISABLED');
    }
    if (msg.includes('email-already-in-use')) {
      throw new Error(
        `O usuário "${normUsername}" já existe na nuvem. Escolha outro nome (ex: ${normUsername}2).`
      );
    }
    if (msg.includes('weak-password')) {
      throw new Error('A senha precisa ter pelo menos 6 caracteres.');
    }
    throw new Error(msg);
  } finally {
    await signOut(secondaryAuth).catch(() => undefined);
  }

  const accountPayload = {
    uid: newUid,
    username: normUsername,
    displayName: cleanDisplayName,
    syntheticEmail,
    role: params.role,
    motoboyId: safeStr(params.motoboyId || '', 64, ''),
    storeOwnerUid: owner.uid,
    active: true,
  };

  try {
    await setDoc(doc(db, 'staffAccounts', newUid), {
      ...accountPayload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `staffAccounts/${newUid}`);
  }

  activeStaffUids = sanitizeStaffUids([...activeStaffUids, newUid]);
  await syncActiveStaffUidsEverywhere(activeStaffUids);

  return {
    uid: newUid,
    username: normUsername,
    displayName: cleanDisplayName,
    role: params.role,
    motoboyId: accountPayload.motoboyId || undefined,
    active: true,
    createdAt: new Date().toISOString(),
  };
}

export async function updateStaffAccountInCloud(
  uid: string,
  patch: Partial<Pick<StaffAccount, 'displayName' | 'role' | 'motoboyId' | 'active'>>
): Promise<void> {
  const owner = firebaseAuth.currentUser;
  if (!owner || !isCurrentUserOwner(owner)) return;

  const cleanUid = safeId(uid, 'uid');
  const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.displayName !== undefined) updates.displayName = safeStr(patch.displayName, 80, 'Equipe');
  if (patch.role !== undefined) updates.role = patch.role;
  if (patch.motoboyId !== undefined) updates.motoboyId = safeStr(patch.motoboyId, 64, '');
  if (patch.active !== undefined) updates.active = Boolean(patch.active);

  try {
    await updateDoc(doc(db, 'staffAccounts', cleanUid), updates);
    await refreshAndPropagateActiveStaffUidsForOwner(owner.uid);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `staffAccounts/${cleanUid}`);
  }
}

export async function deleteStaffAccountFromCloud(uid: string): Promise<void> {
  const owner = firebaseAuth.currentUser;
  if (!owner || !isCurrentUserOwner(owner)) return;

  const cleanUid = safeId(uid, 'uid');
  try {
    await deleteDoc(doc(db, 'staffAccounts', cleanUid));
    await refreshAndPropagateActiveStaffUidsForOwner(owner.uid);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `staffAccounts/${cleanUid}`);
  }
}

async function refreshAndPropagateActiveStaffUidsForOwner(ownerUid: string): Promise<string[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'staffAccounts'), where('storeOwnerUid', '==', ownerUid))
    );
    const activeIds: string[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d?.active === true) {
        activeIds.push(safeStr(d.uid, 128, docSnap.id));
      }
    });
    activeStaffUids = sanitizeStaffUids(activeIds);
    await syncActiveStaffUidsEverywhere(activeStaffUids);
  } catch {
    // Non-critical background sync
  }
  return activeStaffUids;
}

export async function syncActiveStaffUidsEverywhere(staffUids: string[]): Promise<void> {
  const owner = firebaseAuth.currentUser;
  if (!owner || !isCurrentUserOwner(owner)) return;

  const cleanUids = sanitizeStaffUids(staffUids);
  activeStaffUids = cleanUids;

  try {
    await updateDoc(doc(db, 'storePublic', STORE_DOC_ID), {
      activeStaffUids: cleanUids,
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Ignore if storePublic not yet created
  }

  try {
    await updateDoc(doc(db, 'storeSettings', STORE_DOC_ID), {
      staffUids: cleanUids,
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Ignore if storeSettings not yet created
  }

  const colls = ['motoboys', 'orders', 'tables', 'cashShifts'] as const;
  for (const coll of colls) {
    try {
      const snap = await getDocs(
        query(collection(db, coll), where('storeOwnerUid', '==', owner.uid))
      );
      const batch = writeBatch(db);
      let count = 0;
      snap.forEach((docSnap) => {
        if (count < 300) {
          batch.update(docSnap.ref, { staffUids: cleanUids, updatedAt: serverTimestamp() });
          count += 1;
        }
      });
      if (count > 0) {
        await batch.commit();
      }
    } catch {
      // Non-critical background fanout
    }
  }
}

export function subscribeStaffAccountsFromFirestore(
  onData: (accounts: StaffAccount[]) => void
): () => void {
  const owner = firebaseAuth.currentUser;
  if (!owner || !isCurrentUserOwner(owner)) return () => undefined;

  const q = query(collection(db, 'staffAccounts'), where('storeOwnerUid', '==', owner.uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: StaffAccount[] = [];
      const activeIds: string[] = [];
      snapshot.forEach((snap) => {
        const d = snap.data();
        const isActive = Boolean(d.active);
        const uid = safeStr(d.uid, 128, snap.id);
        if (isActive) activeIds.push(uid);
        list.push({
          uid,
          username: safeStr(d.username, 32, ''),
          displayName: safeStr(d.displayName, 80, 'Equipe'),
          role: (d.role as 'BALCAO' | 'MOTOBOY') || 'BALCAO',
          motoboyId: safeStr(d.motoboyId, 64, '') || undefined,
          active: isActive,
          createdAt: toIsoString(d.createdAt),
        });
      });
      activeStaffUids = sanitizeStaffUids(activeIds);
      list.sort((a, b) => a.username.localeCompare(b.username, 'pt-BR'));
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'staffAccounts');
    }
  );
}

// =========================================================================
// HELPERS DE SERIALIZAÇÃO ESTRITA (100% COMPATÍVEL COM firestore.rules)
// =========================================================================
function safeId(raw: string, prefix = 'doc'): string {
  const cleaned = String(raw || '').replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 80);
  return cleaned || `${prefix}-${Date.now()}`;
}

function safeStr(val: unknown, maxLen: number, fallback = ''): string {
  const s = typeof val === 'string' ? val : val == null ? fallback : String(val);
  return s.slice(0, maxLen);
}

function safeNumber(val: unknown, fallback = 0, min = 0, max = 10000000): number {
  const n = typeof val === 'number' && Number.isFinite(val) ? val : Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function safeSignedNumber(val: unknown, fallback = 0, min = -10000000, max = 10000000): number {
  const n = typeof val === 'number' && Number.isFinite(val) ? val : Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function toIsoString(val: unknown, fallback?: string): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (
    val &&
    typeof val === 'object' &&
    'toDate' in val &&
    typeof (val as { toDate?: unknown }).toDate === 'function'
  ) {
    try {
      return (val as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return fallback || new Date().toISOString();
    }
  }
  if (typeof val === 'string' && val.trim()) return val;
  return fallback || new Date().toISOString();
}

function isNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('not-found') || msg.includes('No document to update');
}

function resolveStoreOwnerUidForStaffWrite(): string {
  return activeStoreOwnerUid || firebaseAuth.currentUser?.uid || '';
}

function serializeProduct(p: Product, storeOwnerUid: string) {
  return {
    id: safeId(p.id, 'prod'),
    code: safeStr(p.code, 40, ''),
    name: safeStr(p.name, 160, 'Produto'),
    category: p.category || 'cervejas',
    brand: safeStr(p.brand, 80, 'Depósito'),
    image: safeStr(p.image, 350000, ''),
    description: safeStr(p.description, 500, ''),
    volume: safeStr(p.volume, 40, 'Unidade'),
    baseUnit: p.baseUnit || 'UN',
    conversionFactor: safeNumber(p.conversionFactor, 1, 1, 500),
    packName: safeStr(p.packName, 80, 'Unidade'),
    currentBaseStock: safeNumber(p.currentBaseStock, 0, 0, 1000000),
    minAlertStock: safeNumber(p.minAlertStock, 0, 0, 1000000),
    costUnit: safeNumber(p.costUnit, 0, 0, 1000000),
    priceUnit: safeNumber(p.priceUnit, 0, 0, 1000000),
    pricePack: safeNumber(p.pricePack, 0, 0, 1000000),
    supportsCold: Boolean(p.supportsCold),
    coldSurchargeUnit: safeNumber(p.coldSurchargeUnit, 0, 0, 1000),
    coldSurchargePack: safeNumber(p.coldSurchargePack, 0, 0, 1000),
    isReturnable: Boolean(p.isReturnable),
    vasilhameId: safeStr(p.vasilhameId, 64, ''),
    vasilhameName: safeStr(p.vasilhameName, 120, ''),
    vasilhameDepositPrice: safeNumber(p.vasilhameDepositPrice, 0, 0, 1000),
    storeOwnerUid: safeStr(storeOwnerUid, 128, ''),
  };
}

function serializeVasilhame(v: VasilhameControl, storeOwnerUid: string) {
  return {
    id: safeId(v.id, 'vas'),
    name: safeStr(v.name, 120, 'Vasilhame'),
    bottleType: safeStr(v.bottleType, 80, 'Retornável'),
    fullInStorage: safeNumber(v.fullInStorage, 0, 0, 1000000),
    emptyInYard: safeNumber(v.emptyInYard, 0, 0, 1000000),
    depositPrice: safeNumber(v.depositPrice, 0, 0, 1000),
    totalInCirculationWithCustomers: safeNumber(v.totalInCirculationWithCustomers, 0, 0, 1000000),
    storeOwnerUid: safeStr(storeOwnerUid, 128, ''),
  };
}

function serializeMotoboy(m: Motoboy, staffEmails: string[], storeOwnerUid: string) {
  return {
    id: safeId(m.id, 'moto'),
    name: safeStr(m.name, 120, 'Entregador'),
    phone: safeStr(m.phone, 40, ''),
    vehiclePlate: safeStr(m.vehiclePlate, 24, ''),
    vehicleModel: safeStr(m.vehicleModel, 100, ''),
    isOnline: Boolean(m.isOnline),
    activeDeliveriesCount: safeNumber(m.activeDeliveriesCount, 0, 0, 1000),
    totalDeliveriesCompletedToday: safeNumber(m.totalDeliveriesCompletedToday, 0, 0, 10000),
    totalCollectedCash: safeNumber(m.totalCollectedCash, 0, 0, 1000000),
    totalCollectedCard: safeNumber(m.totalCollectedCard, 0, 0, 1000000),
    totalCollectedPix: safeNumber(m.totalCollectedPix, 0, 0, 1000000),
    commissionBalance: safeNumber(m.commissionBalance, 0, 0, 1000000),
    accessPassword: safeStr(m.accessPassword, 64, ''),
    googleEmail: safeStr(m.googleEmail, 120, '').trim().toLowerCase(),
    storeOwnerUid: safeStr(storeOwnerUid, 128, ''),
    staffEmails: sanitizeStaffEmails(staffEmails),
    staffUids: sanitizeStaffUids(activeStaffUids),
  };
}

function serializeOrder(order: Order, staffEmails: string[], storeOwnerUid: string) {
  return {
    id: safeId(order.id, 'ord'),
    orderNumber: safeNumber(order.orderNumber, 1, 1, 10000000),
    channel: order.channel,
    status: order.status,
    customerUid: safeStr(order.customerUid || firebaseAuth.currentUser?.uid || '', 128, ''),
    customerEmail: safeStr(order.customerEmail || firebaseAuth.currentUser?.email || '', 120, ''),
    storeOwnerUid: safeStr(storeOwnerUid, 128, ''),
    staffEmails: sanitizeStaffEmails(staffEmails),
    staffUids: sanitizeStaffUids(activeStaffUids),
    customer: {
      name: safeStr(order.customer?.name, 120, 'Cliente'),
      phone: safeStr(order.customer?.phone, 40, ''),
      address: safeStr(order.customer?.address, 200, ''),
      number: safeStr(order.customer?.number, 40, 'S/N'),
      neighborhood: safeStr(order.customer?.neighborhood, 120, ''),
      complement: safeStr(order.customer?.complement, 120, ''),
    },
    items: (order.items || []).slice(0, 100).map((it) => ({
      id: safeStr(it.id, 80, 'item'),
      productId: safeStr(it.productId, 80, ''),
      productName: safeStr(it.productName, 160, ''),
      brand: safeStr(it.brand, 80, ''),
      presentation: it.presentation,
      temperature: it.temperature,
      vasilhameOption: it.vasilhameOption,
      quantity: safeNumber(it.quantity, 1, 1, 10000),
      unitsCount: safeNumber(it.unitsCount, 1, 1, 100000),
      unitPrice: safeNumber(it.unitPrice, 0, 0, 1000000),
      coldSurcharge: safeNumber(it.coldSurcharge, 0, 0, 100000),
      vasilhameFee: safeNumber(it.vasilhameFee, 0, 0, 100000),
      subtotal: safeNumber(it.subtotal, 0, 0, 1000000),
      unitCost: safeNumber(it.unitCost, 0, 0, 1000000),
      totalCost: safeNumber(it.totalCost, 0, 0, 1000000),
    })),
    subtotalProducts: safeNumber(order.subtotalProducts, 0, 0, 1000000),
    totalColdSurcharge: safeNumber(order.totalColdSurcharge, 0, 0, 100000),
    totalVasilhameFee: safeNumber(order.totalVasilhameFee, 0, 0, 100000),
    deliveryFee: safeNumber(order.deliveryFee, 0, 0, 10000),
    totalAmount: safeNumber(order.totalAmount, 0, 0, 1000000),
    totalCost: safeNumber(order.totalCost, 0, 0, 1000000),
    grossProfit: safeSignedNumber(order.grossProfit, 0, -1000000, 1000000),
    paymentMethod: order.paymentMethod,
    changeFor: safeNumber(order.changeFor, 0, 0, 1000000),
    motoboyId: safeStr(order.motoboyId, 64, ''),
    motoboyName: safeStr(order.motoboyName, 120, ''),
    motoboyAssignedAt: safeStr(order.motoboyAssignedAt, 40, ''),
    deliveredAt: safeStr(order.deliveredAt, 40, ''),
    estimatedDeliveryMinutes: safeNumber(order.estimatedDeliveryMinutes, 30, 0, 300),
    vasilhamesVaziosAReceber: safeNumber(order.vasilhamesVaziosAReceber, 0, 0, 10000),
    vasilhamesNovosVendidos: safeNumber(order.vasilhamesNovosVendidos, 0, 0, 10000),
    messages: (order.messages || []).slice(0, 100).map((m) => ({
      id: safeStr(m.id, 80, ''),
      orderId: safeStr(m.orderId, 80, ''),
      sender: m.sender,
      senderName: safeStr(m.senderName, 120, ''),
      text: safeStr(m.text, 500, ''),
      timestamp: safeStr(m.timestamp, 40, ''),
    })),
    canceledAt: safeStr(order.canceledAt, 40, ''),
    canceledBy: safeStr(order.canceledBy, 120, ''),
    cancelReason: safeStr(order.cancelReason, 240, ''),
    clientCreatedAt: safeStr(order.createdAt, 40, new Date().toISOString()),
  };
}

function serializeTableTab(t: TableTab, staffEmails: string[], storeOwnerUid: string) {
  return {
    id: safeId(t.id, 'MESA'),
    numberOrLabel: safeStr(t.numberOrLabel, 80, 'Mesa'),
    customerName: safeStr(t.customerName, 120, ''),
    status: t.status,
    openedAt: safeStr(t.openedAt, 40, new Date().toISOString()),
    closedAt: safeStr(t.closedAt, 40, ''),
    openedBy: safeStr(t.openedBy, 120, 'Balcão'),
    closedBy: safeStr(t.closedBy, 120, ''),
    items: (t.items || []).slice(0, 150).map((it) => ({
      id: safeStr(it.id, 80, ''),
      productId: safeStr(it.productId, 80, ''),
      productName: safeStr(it.productName, 160, ''),
      brand: safeStr(it.brand, 80, ''),
      volume: safeStr(it.volume, 40, ''),
      presentation: it.presentation,
      temperature: it.temperature,
      vasilhameOption: it.vasilhameOption,
      quantity: safeNumber(it.quantity, 1, 1, 10000),
      unitsPerItem: safeNumber(it.unitsPerItem, 1, 1, 1000),
      unitPrice: safeNumber(it.unitPrice, 0, 0, 1000000),
      coldSurchargeUnit: safeNumber(it.coldSurchargeUnit, 0, 0, 1000),
      vasilhameFeeUnit: safeNumber(it.vasilhameFeeUnit, 0, 0, 1000),
      subtotal: safeNumber(it.subtotal, 0, 0, 1000000),
      addedAt: safeStr(it.addedAt, 40, new Date().toISOString()),
    })),
    totalAmount: safeNumber(t.totalAmount, 0, 0, 1000000),
    paymentMethod: safeStr(t.paymentMethod, 32, ''),
    changeFor: safeNumber(t.changeFor, 0, 0, 1000000),
    orderId: safeStr(t.orderId, 80, ''),
    orderNumber: safeNumber(t.orderNumber, 0, 0, 10000000),
    storeOwnerUid: safeStr(storeOwnerUid, 128, ''),
    staffEmails: sanitizeStaffEmails(staffEmails),
    staffUids: sanitizeStaffUids(activeStaffUids),
  };
}

function serializeCashShift(s: CashShift, staffEmails: string[], storeOwnerUid: string) {
  const sid = safeId(s.id, 'SHIFT');
  return {
    id: sid,
    shiftId: sid.slice(0, 64),
    cashierName: safeStr(s.cashierName, 120, 'Operador'),
    status: s.status,
    openedAt: safeStr(s.openedAt, 40, new Date().toISOString()),
    closedAt: safeStr(s.closedAt, 40, ''),
    initialFloat: safeNumber(s.initialFloat, 0, 0, 1000000),
    balcaoCash: safeNumber(s.balcaoCash, 0, 0, 1000000),
    balcaoCard: safeNumber(s.balcaoCard, 0, 0, 1000000),
    balcaoPix: safeNumber(s.balcaoPix, 0, 0, 1000000),
    deliveryCash: safeNumber(s.deliveryCash, 0, 0, 1000000),
    deliveryCard: safeNumber(s.deliveryCard, 0, 0, 1000000),
    deliveryPix: safeNumber(s.deliveryPix, 0, 0, 1000000),
    closingCashInDrawer: safeNumber(s.closingCashInDrawer, 0, 0, 1000000),
    closingDifference: safeSignedNumber(s.closingDifference, 0, -1000000, 1000000),
    closingNotes: safeStr(s.closingNotes, 400, ''),
    storeOwnerUid: safeStr(storeOwnerUid, 128, ''),
    staffEmails: sanitizeStaffEmails(staffEmails),
    staffUids: sanitizeStaffUids(activeStaffUids),
  };
}

function serializeShiftRecord(r: CashShiftRecord, staffEmails: string[], storeOwnerUid: string) {
  return {
    id: safeId(r.id, 'SHIFT'),
    cashierName: safeStr(r.cashierName, 120, 'Operador'),
    openedAt: safeStr(r.openedAt, 40, new Date().toISOString()),
    closedAt: safeStr(r.closedAt, 40, new Date().toISOString()),
    initialFloat: safeNumber(r.initialFloat, 0, 0, 1000000),
    totalBalcao: safeNumber(r.totalBalcao, 0, 0, 10000000),
    totalDelivery: safeNumber(r.totalDelivery, 0, 0, 10000000),
    totalSales: safeNumber(r.totalSales, 0, 0, 10000000),
    balcaoCash: safeNumber(r.balcaoCash, 0, 0, 10000000),
    balcaoCard: safeNumber(r.balcaoCard, 0, 0, 10000000),
    balcaoPix: safeNumber(r.balcaoPix, 0, 0, 10000000),
    deliveryCash: safeNumber(r.deliveryCash, 0, 0, 10000000),
    deliveryCard: safeNumber(r.deliveryCard, 0, 0, 10000000),
    deliveryPix: safeNumber(r.deliveryPix, 0, 0, 10000000),
    totalCashInflows: safeNumber(r.totalCashInflows, 0, 0, 10000000),
    totalCashOutflows: safeNumber(r.totalCashOutflows, 0, 0, 10000000),
    cashFlowMovements: (r.cashFlowMovements || []).slice(0, 200).map((cf) => ({
      id: safeStr(cf.id, 64, ''),
      shiftId: safeStr(cf.shiftId, 64, ''),
      type: cf.type,
      category: cf.category,
      amount: safeNumber(cf.amount, 0, 0, 1000000),
      description: safeStr(cf.description, 240, ''),
      createdBy: safeStr(cf.createdBy, 100, ''),
      createdAt: safeStr(cf.createdAt, 40, ''),
    })),
    expectedFinalCash: safeSignedNumber(r.expectedFinalCash, 0, -10000000, 10000000),
    finalCashInDrawer: safeNumber(r.finalCashInDrawer, 0, 0, 10000000),
    closingDifference: safeSignedNumber(r.closingDifference, 0, -10000000, 10000000),
    totalCostOfGoods: safeNumber(r.totalCostOfGoods, 0, 0, 10000000),
    totalGrossProfit: safeSignedNumber(r.totalGrossProfit, 0, -10000000, 10000000),
    ordersCount: safeNumber(r.ordersCount, 0, 0, 100000),
    canceledOrdersCount: safeNumber(r.canceledOrdersCount, 0, 0, 100000),
    canceledTotalValue: safeNumber(r.canceledTotalValue, 0, 0, 10000000),
    soldProducts: (r.soldProducts || []).slice(0, 500).map((sp) => ({
      productId: safeStr(sp.productId, 80, ''),
      productName: safeStr(sp.productName, 160, ''),
      brand: safeStr(sp.brand, 80, ''),
      unitsSold: safeNumber(sp.unitsSold, 0, 0, 1000000),
      packsCount: safeNumber(sp.packsCount, 0, 0, 1000000),
      singlesCount: safeNumber(sp.singlesCount, 0, 0, 1000000),
      revenue: safeNumber(sp.revenue, 0, 0, 10000000),
      costTotal: safeNumber(sp.costTotal, 0, 0, 10000000),
      profitTotal: safeSignedNumber(sp.profitTotal, 0, -10000000, 10000000),
    })),
    notes: safeStr(r.notes, 400, ''),
    storeOwnerUid: safeStr(storeOwnerUid, 128, ''),
    staffEmails: sanitizeStaffEmails(staffEmails),
    staffUids: sanitizeStaffUids(activeStaffUids),
  };
}

function serializeStockMovement(m: StockMovement, staffEmails: string[], storeOwnerUid: string) {
  return {
    id: safeId(m.id, 'mov'),
    productId: safeStr(m.productId, 80, ''),
    productName: safeStr(m.productName, 160, ''),
    type: m.type,
    unitsQuantity: safeNumber(m.unitsQuantity, 0, 0, 1000000),
    previousStock: safeNumber(m.previousStock, 0, 0, 1000000),
    newStock: safeNumber(m.newStock, 0, 0, 1000000),
    reason: safeStr(m.reason, 240, ''),
    clientCreatedAt: safeStr(m.createdAt, 40, new Date().toISOString()),
    storeOwnerUid: safeStr(storeOwnerUid, 128, ''),
    staffEmails: sanitizeStaffEmails(staffEmails),
    staffUids: sanitizeStaffUids(activeStaffUids),
  };
}

// =========================================================================
// SUBSCRIPTIONS EM TEMPO REAL (onSnapshot)
// =========================================================================

export function subscribePublicStoreSettings(
  onData: (partial: Partial<DepotSettings>) => void
): () => void {
  const path = `storePublic/${STORE_DOC_ID}`;
  return onSnapshot(
    doc(db, 'storePublic', STORE_DOC_ID),
    (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      if (typeof d.ownerUid === 'string' && d.ownerUid) {
        activeStoreOwnerUid = d.ownerUid;
      }
      if (Array.isArray(d.activeStaffUids)) {
        activeStaffUids = sanitizeStaffUids(d.activeStaffUids as string[]);
      }
      onData({
        storeName: safeStr(d.storeName, 120, 'GelaFácil Express'),
        phone: safeStr(d.phone, 40, '(21) 97947-4405'),
        address: safeStr(d.address, 200, 'Avenida Hermínio Aurélio Sampaio, 53'),
        neighborhood: safeStr(d.neighborhood, 120, 'Entrega Local'),
        city: safeStr(d.city, 120, 'Rio de Janeiro - RJ'),
        defaultDeliveryFee: safeNumber(d.defaultDeliveryFee, 7, 0, 1000),
        minDeliveryMinutes: safeNumber(d.minDeliveryMinutes, 15, 1, 300),
        maxDeliveryMinutes: safeNumber(d.maxDeliveryMinutes, 30, 1, 300),
        allowNegativeStock: Boolean(d.allowNegativeStock),
        staffUids: activeStaffUids,
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeOwnerPrivateSettings(
  onData: (settings: DepotSettings) => void
): () => void {
  const user = firebaseAuth.currentUser;
  if (!user || !user.emailVerified || !isCurrentUserOwner(user)) return () => undefined;

  const path = `storeSettings/${STORE_DOC_ID}`;
  return onSnapshot(
    doc(db, 'storeSettings', STORE_DOC_ID),
    (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      const loadedOwnerEmail = safeStr(d.ownerEmail, 120, user.email || '').trim().toLowerCase();
      if (loadedOwnerEmail) activeStoreOwnerEmail = loadedOwnerEmail;
      if (typeof d.ownerUid === 'string' && d.ownerUid) activeStoreOwnerUid = d.ownerUid;

      if (Array.isArray(d.staffUids)) {
        activeStaffUids = sanitizeStaffUids(d.staffUids as string[]);
      }

      onData({
        storeName: safeStr(d.storeName, 120, 'GelaFácil Express'),
        phone: safeStr(d.phone, 40, '(21) 97947-4405'),
        address: safeStr(d.address, 200, 'Avenida Hermínio Aurélio Sampaio, 53'),
        neighborhood: safeStr(d.neighborhood, 120, 'Entrega Local'),
        city: safeStr(d.city, 120, 'Rio de Janeiro - RJ'),
        cnpj: safeStr(d.cnpj, 32, '12.345.678/0001-90'),
        defaultDeliveryFee: safeNumber(d.defaultDeliveryFee, 7, 0, 1000),
        minDeliveryMinutes: safeNumber(d.minDeliveryMinutes, 15, 1, 300),
        maxDeliveryMinutes: safeNumber(d.maxDeliveryMinutes, 30, 1, 300),
        motoboyCommission: safeNumber(d.motoboyCommission, 8, 0, 1000),
        allowNegativeStock: Boolean(d.allowNegativeStock),
        autoPrintReceipt: Boolean(d.autoPrintReceipt),
        cancelPassword: safeStr(d.cancelPassword, 64, '123'),
        ownerPassword: safeStr(d.ownerPassword, 64, '123'),
        balcaoPassword: safeStr(d.balcaoPassword, 64, '123'),
        motoboyDefaultPassword: safeStr(d.motoboyDefaultPassword, 64, '123'),
        ownerWhatsApp: safeStr(d.ownerWhatsApp, 32, '5521979474405'),
        ownerEmail: loadedOwnerEmail,
        staffEmails: sanitizeStaffEmails(d.staffEmails as string[] | undefined, loadedOwnerEmail),
        staffUids: activeStaffUids,
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeProductsFromFirestore(
  onData: (products: Product[]) => void
): () => void {
  const path = 'products';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      if (snapshot.empty) return;
      const list: Product[] = [];
      snapshot.forEach((snap) => {
        const d = snap.data();
        list.push({
          id: safeStr(d.id, 80, snap.id),
          code: safeStr(d.code, 40, '') || undefined,
          name: safeStr(d.name, 160, ''),
          category: (d.category as Product['category']) || 'cervejas',
          brand: safeStr(d.brand, 80, ''),
          image: safeStr(d.image, 350000, ''),
          description: safeStr(d.description, 500, ''),
          volume: safeStr(d.volume, 40, ''),
          baseUnit: (d.baseUnit as Product['baseUnit']) || 'UN',
          conversionFactor: safeNumber(d.conversionFactor, 1, 1, 500),
          packName: safeStr(d.packName, 80, 'Unidade'),
          currentBaseStock: safeNumber(d.currentBaseStock, 0, 0, 1000000),
          minAlertStock: safeNumber(d.minAlertStock, 0, 0, 1000000),
          costUnit: safeNumber(d.costUnit, 0, 0, 1000000) || undefined,
          priceUnit: safeNumber(d.priceUnit, 0, 0, 1000000),
          pricePack: safeNumber(d.pricePack, 0, 0, 1000000),
          supportsCold: Boolean(d.supportsCold),
          coldSurchargeUnit: safeNumber(d.coldSurchargeUnit, 0, 0, 1000),
          coldSurchargePack: safeNumber(d.coldSurchargePack, 0, 0, 1000),
          isReturnable: Boolean(d.isReturnable),
          vasilhameId: safeStr(d.vasilhameId, 64, '') || undefined,
          vasilhameName: safeStr(d.vasilhameName, 120, '') || undefined,
          vasilhameDepositPrice: safeNumber(d.vasilhameDepositPrice, 0, 0, 1000) || undefined,
        });
      });
      list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeVasilhamesFromFirestore(
  onData: (vasilhames: VasilhameControl[]) => void
): () => void {
  const path = 'vasilhames';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      if (snapshot.empty) return;
      const list: VasilhameControl[] = [];
      snapshot.forEach((snap) => {
        const d = snap.data();
        list.push({
          id: safeStr(d.id, 64, snap.id),
          name: safeStr(d.name, 120, ''),
          bottleType: safeStr(d.bottleType, 80, ''),
          fullInStorage: safeNumber(d.fullInStorage, 0, 0, 1000000),
          emptyInYard: safeNumber(d.emptyInYard, 0, 0, 1000000),
          depositPrice: safeNumber(d.depositPrice, 0, 0, 1000),
          totalInCirculationWithCustomers: safeNumber(d.totalInCirculationWithCustomers, 0, 0, 1000000),
        });
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

function buildStaffQuery(collectionName: string) {
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  if (isCurrentUserOwner(user)) {
    return query(collection(db, collectionName), where('storeOwnerUid', '==', user.uid));
  }
  if (isSyntheticStaffEmail(user.email)) {
    return query(collection(db, collectionName), where('staffUids', 'array-contains', user.uid));
  }
  if (user.emailVerified && user.email) {
    const email = user.email.trim().toLowerCase();
    return query(collection(db, collectionName), where('staffEmails', 'array-contains', email));
  }
  return null;
}

export function subscribeMotoboysFromFirestore(
  onData: (motoboys: Motoboy[]) => void
): () => void {
  const q = buildStaffQuery('motoboys');
  if (!q) return () => undefined;

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) return;
      const list: Motoboy[] = [];
      snapshot.forEach((snap) => {
        const d = snap.data();
        list.push({
          id: safeStr(d.id, 64, snap.id),
          name: safeStr(d.name, 120, ''),
          phone: safeStr(d.phone, 40, ''),
          vehiclePlate: safeStr(d.vehiclePlate, 24, ''),
          vehicleModel: safeStr(d.vehicleModel, 100, ''),
          isOnline: Boolean(d.isOnline),
          activeDeliveriesCount: safeNumber(d.activeDeliveriesCount, 0, 0, 1000),
          totalDeliveriesCompletedToday: safeNumber(d.totalDeliveriesCompletedToday, 0, 0, 10000),
          totalCollectedCash: safeNumber(d.totalCollectedCash, 0, 0, 1000000),
          totalCollectedCard: safeNumber(d.totalCollectedCard, 0, 0, 1000000),
          totalCollectedPix: safeNumber(d.totalCollectedPix, 0, 0, 1000000),
          commissionBalance: safeNumber(d.commissionBalance, 0, 0, 1000000),
          accessPassword: safeStr(d.accessPassword, 64, '') || undefined,
          googleEmail: safeStr(d.googleEmail, 120, '') || undefined,
        });
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'motoboys');
    }
  );
}

function mapOrderDoc(snapId: string, d: Record<string, unknown>): Order {
  const cust = (d.customer || {}) as Record<string, unknown>;
  const createdAtIso = toIsoString(d.clientCreatedAt || d.createdAt);
  const updatedAtIso = toIsoString(d.updatedAt, createdAtIso);
  return {
    id: safeStr(d.id, 80, snapId),
    orderNumber: safeNumber(d.orderNumber, 1001, 1, 10000000),
    channel: (d.channel as Order['channel']) || 'DELIVERY_APP',
    status: (d.status as Order['status']) || 'PENDENTE',
    createdAt: createdAtIso,
    updatedAt: updatedAtIso,
    customerUid: safeStr(d.customerUid, 128, '') || undefined,
    customerEmail: safeStr(d.customerEmail, 120, '') || undefined,
    customer: {
      name: safeStr(cust.name, 120, 'Cliente'),
      phone: safeStr(cust.phone, 40, ''),
      address: safeStr(cust.address, 200, ''),
      number: safeStr(cust.number, 40, 'S/N'),
      neighborhood: safeStr(cust.neighborhood, 120, ''),
      complement: safeStr(cust.complement, 120, '') || undefined,
    },
    items: Array.isArray(d.items) ? (d.items as Order['items']) : [],
    subtotalProducts: safeNumber(d.subtotalProducts, 0, 0, 1000000),
    totalColdSurcharge: safeNumber(d.totalColdSurcharge, 0, 0, 100000),
    totalVasilhameFee: safeNumber(d.totalVasilhameFee, 0, 0, 100000),
    deliveryFee: safeNumber(d.deliveryFee, 0, 0, 10000),
    totalAmount: safeNumber(d.totalAmount, 0, 0, 1000000),
    totalCost: safeNumber(d.totalCost, 0, 0, 1000000),
    grossProfit: safeSignedNumber(d.grossProfit, 0, -1000000, 1000000),
    paymentMethod: (d.paymentMethod as Order['paymentMethod']) || 'PIX',
    changeFor: safeNumber(d.changeFor, 0, 0, 1000000) || undefined,
    motoboyId: safeStr(d.motoboyId, 64, '') || undefined,
    motoboyName: safeStr(d.motoboyName, 120, '') || undefined,
    motoboyAssignedAt: safeStr(d.motoboyAssignedAt, 40, '') || undefined,
    deliveredAt: safeStr(d.deliveredAt, 40, '') || undefined,
    estimatedDeliveryMinutes: safeNumber(d.estimatedDeliveryMinutes, 30, 0, 300),
    vasilhamesVaziosAReceber: safeNumber(d.vasilhamesVaziosAReceber, 0, 0, 10000),
    vasilhamesNovosVendidos: safeNumber(d.vasilhamesNovosVendidos, 0, 0, 10000),
    messages: Array.isArray(d.messages) ? (d.messages as OrderMessage[]) : [],
    canceledAt: safeStr(d.canceledAt, 40, '') || undefined,
    canceledBy: safeStr(d.canceledBy, 120, '') || undefined,
    cancelReason: safeStr(d.cancelReason, 240, '') || undefined,
  };
}

export function subscribeStaffOrdersFromFirestore(
  onData: (orders: Order[], rawDocsStaffMap?: Map<string, string[]>) => void
): () => void {
  const q = buildStaffQuery('orders');
  if (!q) return () => undefined;

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Order[] = [];
      const staffMap = new Map<string, string[]>();
      snapshot.forEach((snap) => {
        const data = snap.data();
        const mapped = mapOrderDoc(snap.id, data);
        list.push(mapped);
        staffMap.set(mapped.id, Array.isArray(data.staffEmails) ? (data.staffEmails as string[]) : []);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(list, staffMap);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    }
  );
}

export function subscribeCustomerOrdersFromFirestore(
  onData: (orders: Order[]) => void
): () => void {
  const user = firebaseAuth.currentUser;
  if (!user || !user.emailVerified) return () => undefined;

  const q = query(collection(db, 'orders'), where('customerUid', '==', user.uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((snap) => {
        list.push(mapOrderDoc(snap.id, snap.data()));
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    }
  );
}

export function subscribeTablesFromFirestore(
  onData: (tables: TableTab[]) => void
): () => void {
  const q = buildStaffQuery('tables');
  if (!q) return () => undefined;

  return onSnapshot(
    q,
    (snapshot) => {
      const list: TableTab[] = [];
      snapshot.forEach((snap) => {
        const d = snap.data();
        list.push({
          id: safeStr(d.id, 80, snap.id),
          numberOrLabel: safeStr(d.numberOrLabel, 80, 'Mesa'),
          customerName: safeStr(d.customerName, 120, ''),
          status: (d.status as TableTab['status']) || 'OPEN',
          openedAt: safeStr(d.openedAt, 40, new Date().toISOString()),
          closedAt: safeStr(d.closedAt, 40, '') || undefined,
          openedBy: safeStr(d.openedBy, 120, 'Balcão'),
          closedBy: safeStr(d.closedBy, 120, '') || undefined,
          items: Array.isArray(d.items) ? (d.items as TableTab['items']) : [],
          totalAmount: safeNumber(d.totalAmount, 0, 0, 1000000),
          paymentMethod: (safeStr(d.paymentMethod, 32, '') as TableTab['paymentMethod']) || undefined,
          changeFor: safeNumber(d.changeFor, 0, 0, 1000000) || undefined,
          orderId: safeStr(d.orderId, 80, '') || undefined,
          orderNumber: safeNumber(d.orderNumber, 0, 0, 10000000) || undefined,
        });
      });
      list.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tables');
    }
  );
}

export function subscribeCashShiftsFromFirestore(
  onData: (latestShift: CashShift | null) => void
): () => void {
  const q = buildStaffQuery('cashShifts');
  if (!q) return () => undefined;

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) return;
      const list: CashShift[] = [];
      snapshot.forEach((snap) => {
        const d = snap.data();
        list.push({
          id: safeStr(d.id, 64, snap.id),
          cashierName: safeStr(d.cashierName, 120, 'Operador'),
          status: (d.status as CashShift['status']) || 'CLOSED',
          openedAt: safeStr(d.openedAt, 40, new Date().toISOString()),
          closedAt: safeStr(d.closedAt, 40, '') || undefined,
          initialFloat: safeNumber(d.initialFloat, 0, 0, 1000000),
          balcaoCash: safeNumber(d.balcaoCash, 0, 0, 1000000),
          balcaoCard: safeNumber(d.balcaoCard, 0, 0, 1000000),
          balcaoPix: safeNumber(d.balcaoPix, 0, 0, 1000000),
          deliveryCash: safeNumber(d.deliveryCash, 0, 0, 1000000),
          deliveryCard: safeNumber(d.deliveryCard, 0, 0, 1000000),
          deliveryPix: safeNumber(d.deliveryPix, 0, 0, 1000000),
          closingCashInDrawer: safeNumber(d.closingCashInDrawer, 0, 0, 1000000),
          closingDifference: safeSignedNumber(d.closingDifference, 0, -1000000, 1000000),
          closingNotes: safeStr(d.closingNotes, 400, '') || undefined,
        });
      });
      list.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
      onData(list[0] || null);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'cashShifts');
    }
  );
}

export function subscribeShiftHistoryFromFirestore(
  onData: (records: CashShiftRecord[]) => void
): () => void {
  const q = buildStaffQuery('shiftHistory');
  if (!q) return () => undefined;

  return onSnapshot(
    q,
    (snapshot) => {
      const list: CashShiftRecord[] = [];
      snapshot.forEach((snap) => {
        const d = snap.data();
        list.push({
          id: safeStr(d.id, 64, snap.id),
          cashierName: safeStr(d.cashierName, 120, 'Operador'),
          openedAt: safeStr(d.openedAt, 40, new Date().toISOString()),
          closedAt: safeStr(d.closedAt, 40, new Date().toISOString()),
          initialFloat: safeNumber(d.initialFloat, 0, 0, 1000000),
          totalBalcao: safeNumber(d.totalBalcao, 0, 0, 10000000),
          totalDelivery: safeNumber(d.totalDelivery, 0, 0, 10000000),
          totalSales: safeNumber(d.totalSales, 0, 0, 10000000),
          balcaoCash: safeNumber(d.balcaoCash, 0, 0, 10000000),
          balcaoCard: safeNumber(d.balcaoCard, 0, 0, 10000000),
          balcaoPix: safeNumber(d.balcaoPix, 0, 0, 10000000),
          deliveryCash: safeNumber(d.deliveryCash, 0, 0, 10000000),
          deliveryCard: safeNumber(d.deliveryCard, 0, 0, 10000000),
          deliveryPix: safeNumber(d.deliveryPix, 0, 0, 10000000),
          totalCashInflows: safeNumber(d.totalCashInflows, 0, 0, 10000000),
          totalCashOutflows: safeNumber(d.totalCashOutflows, 0, 0, 10000000),
          cashFlowMovements: Array.isArray(d.cashFlowMovements)
            ? (d.cashFlowMovements as CashFlowMovement[])
            : [],
          expectedFinalCash: safeSignedNumber(d.expectedFinalCash, 0, -10000000, 10000000),
          finalCashInDrawer: safeNumber(d.finalCashInDrawer, 0, 0, 10000000),
          closingDifference: safeSignedNumber(d.closingDifference, 0, -10000000, 10000000),
          totalCostOfGoods: safeNumber(d.totalCostOfGoods, 0, 0, 10000000),
          totalGrossProfit: safeSignedNumber(d.totalGrossProfit, 0, -10000000, 10000000),
          ordersCount: safeNumber(d.ordersCount, 0, 0, 100000),
          canceledOrdersCount: safeNumber(d.canceledOrdersCount, 0, 0, 100000),
          canceledTotalValue: safeNumber(d.canceledTotalValue, 0, 0, 10000000),
          soldProducts: Array.isArray(d.soldProducts)
            ? (d.soldProducts as CashShiftRecord['soldProducts'])
            : [],
          notes: safeStr(d.notes, 400, '') || undefined,
        });
      });
      list.sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime());
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'shiftHistory');
    }
  );
}

export function subscribeCashFlowsFromFirestore(
  onData: (movements: CashFlowMovement[]) => void
): () => void {
  const q = buildStaffQuery('cashFlows');
  if (!q) return () => undefined;

  return onSnapshot(
    q,
    (snapshot) => {
      const list: CashFlowMovement[] = [];
      snapshot.forEach((snap) => {
        const d = snap.data();
        list.push({
          id: safeStr(d.id, 64, snap.id),
          shiftId: safeStr(d.shiftId, 64, ''),
          type: (d.type as CashFlowMovement['type']) || 'RETIRADA_DESPESA',
          category: (d.category as CashFlowMovement['category']) || 'DESPESA_LOJA',
          amount: safeNumber(d.amount, 0, 0, 1000000),
          description: safeStr(d.description, 240, ''),
          createdBy: safeStr(d.createdBy, 100, 'Dono'),
          createdAt: toIsoString(d.createdAt),
        });
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'cashFlows');
    }
  );
}

export function subscribeStockMovementsFromFirestore(
  onData: (movements: StockMovement[]) => void
): () => void {
  const q = buildStaffQuery('stockMovements');
  if (!q) return () => undefined;

  return onSnapshot(
    q,
    (snapshot) => {
      const list: StockMovement[] = [];
      snapshot.forEach((snap) => {
        const d = snap.data();
        list.push({
          id: safeStr(d.id, 80, snap.id),
          productId: safeStr(d.productId, 80, ''),
          productName: safeStr(d.productName, 160, ''),
          type: (d.type as StockMovement['type']) || 'AJUSTE',
          unitsQuantity: safeNumber(d.unitsQuantity, 0, 0, 1000000),
          previousStock: safeNumber(d.previousStock, 0, 0, 1000000),
          newStock: safeNumber(d.newStock, 0, 0, 1000000),
          reason: safeStr(d.reason, 240, ''),
          createdAt: toIsoString(d.clientCreatedAt || d.createdAt),
        });
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'stockMovements');
    }
  );
}

// =========================================================================
// OPERAÇÕES DE ESCRITA NA NUVEM
// =========================================================================

export async function syncCashFlowToFirestore(
  movement: CashFlowMovement,
  staffEmails: string[] = []
): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!canPerformCloudStaffWrite(user) || !user) return;

  const storeOwnerUid = resolveStoreOwnerUidForStaffWrite();
  const flowId = safeId(movement.id, 'flow');
  const path = `cashFlows/${flowId}`;
  try {
    await setDoc(doc(db, 'cashFlows', flowId), {
      id: flowId,
      shiftId: safeId(movement.shiftId, 'SHIFT'),
      ownerUid: user.uid,
      storeOwnerUid,
      staffEmails: sanitizeStaffEmails(staffEmails),
      staffUids: sanitizeStaffUids(activeStaffUids),
      type: movement.type,
      category: movement.category,
      amount: safeNumber(movement.amount, 0.01, 0.01, 1000000),
      description: safeStr(movement.description, 240, 'Movimentação'),
      createdBy: safeStr(movement.createdBy, 100, 'Dono'),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteCashFlowFromFirestore(flowId: string): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!canPerformCloudStaffWrite(user)) return;

  const id = safeId(flowId, 'flow');
  const path = `cashFlows/${id}`;
  try {
    await deleteDoc(doc(db, 'cashFlows', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncStoreSettingsToCloud(settings: DepotSettings): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!canPerformCloudStaffWrite(user) || !user) return;

  const userEmail = (user.email || '').trim().toLowerCase();
  const staffEmails = sanitizeStaffEmails(settings.staffEmails, activeStoreOwnerEmail || userEmail);
  const staffUids = sanitizeStaffUids(
    activeStaffUids.length > 0 ? activeStaffUids : settings.staffUids
  );
  const storeOwnerUid = activeStoreOwnerUid || user.uid;

  const publicPayload = {
    id: STORE_DOC_ID,
    ownerUid: storeOwnerUid,
    storeName: safeStr(settings.storeName, 120, 'GelaFácil Express'),
    phone: safeStr(settings.phone, 40, '(21) 97947-4405'),
    address: safeStr(settings.address, 200, 'Avenida Hermínio Aurélio Sampaio, 53'),
    neighborhood: safeStr(settings.neighborhood, 120, 'Entrega Local'),
    city: safeStr(settings.city, 120, 'Rio de Janeiro - RJ'),
    defaultDeliveryFee: safeNumber(settings.defaultDeliveryFee, 7, 0, 1000),
    minDeliveryMinutes: safeNumber(settings.minDeliveryMinutes, 15, 1, 300),
    maxDeliveryMinutes: safeNumber(settings.maxDeliveryMinutes, 30, 1, 300),
    allowNegativeStock: Boolean(settings.allowNegativeStock),
    activeStaffUids: staffUids,
  };

  try {
    const pubRef = doc(db, 'storePublic', STORE_DOC_ID);
    try {
      const {
        ownerUid: _ou,
        id: _id,
        activeStaffUids: _asu,
        ...staffPublicUpdatable
      } = publicPayload;
      await updateDoc(pubRef, {
        ...staffPublicUpdatable,
        ...(isCurrentUserOwner(user) ? { activeStaffUids: staffUids } : {}),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      if (isNotFoundError(err)) {
        await setDoc(pubRef, {
          ...publicPayload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        throw err;
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `storePublic/${STORE_DOC_ID}`);
  }

  if (!isCurrentUserOwner(user)) return;

  const privatePayload = {
    id: STORE_DOC_ID,
    ownerUid: user.uid,
    ownerEmail: userEmail,
    staffEmails,
    staffUids,
    storeName: publicPayload.storeName,
    phone: publicPayload.phone,
    address: publicPayload.address,
    neighborhood: publicPayload.neighborhood,
    city: publicPayload.city,
    cnpj: safeStr(settings.cnpj, 32, '12.345.678/0001-90'),
    defaultDeliveryFee: publicPayload.defaultDeliveryFee,
    minDeliveryMinutes: publicPayload.minDeliveryMinutes,
    maxDeliveryMinutes: publicPayload.maxDeliveryMinutes,
    motoboyCommission: safeNumber(settings.motoboyCommission, 8, 0, 1000),
    allowNegativeStock: publicPayload.allowNegativeStock,
    autoPrintReceipt: Boolean(settings.autoPrintReceipt),
    cancelPassword: safeStr(settings.cancelPassword, 64, '123') || '123',
    ownerPassword: safeStr(settings.ownerPassword, 64, '123') || '123',
    balcaoPassword: safeStr(settings.balcaoPassword, 64, '123') || '123',
    motoboyDefaultPassword: safeStr(settings.motoboyDefaultPassword, 64, '123') || '123',
    ownerWhatsApp: safeStr(settings.ownerWhatsApp, 32, '5521979474405'),
  };

  try {
    const privRef = doc(db, 'storeSettings', STORE_DOC_ID);
    try {
      const { id: _id, ownerUid: _uid, ownerEmail: _email, ...updatable } = privatePayload;
      await updateDoc(privRef, { ...updatable, updatedAt: serverTimestamp() });
    } catch (err) {
      if (isNotFoundError(err)) {
        await setDoc(privRef, {
          ...privatePayload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        throw err;
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `storeSettings/${STORE_DOC_ID}`);
  }
}

export async function syncStaffAccessListToCloud(
  staffEmails: string[],
  motoboys: Motoboy[] = []
): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!user || !user.emailVerified || !user.email || !isCurrentUserOwner(user)) return;

  const ownerEmail = user.email.trim().toLowerCase();
  const cleanList = sanitizeStaffEmails(staffEmails, ownerEmail);
  const motoboyEmailSet = new Set(
    motoboys.map((m) => (m.googleEmail || '').trim().toLowerCase()).filter(Boolean)
  );

  try {
    const existingSnap = await getDocs(collection(db, 'staffAccess'));
    const existingEmails = new Set<string>();
    existingSnap.forEach((s) => existingEmails.add(s.id));

    for (const email of cleanList) {
      const role: 'BALCAO' | 'MOTOBOY' = motoboyEmailSet.has(email) ? 'MOTOBOY' : 'BALCAO';
      const ref = doc(db, 'staffAccess', email);
      if (existingEmails.has(email)) {
        await updateDoc(ref, { role, active: true, updatedAt: serverTimestamp() });
      } else {
        await setDoc(ref, {
          email,
          storeOwnerUid: user.uid,
          ownerEmail,
          role,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    for (const oldEmail of existingEmails) {
      if (!cleanList.includes(oldEmail)) {
        await deleteDoc(doc(db, 'staffAccess', oldEmail));
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'staffAccess');
  }
}

export async function syncProductToCloud(product: Product): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!canPerformCloudStaffWrite(user) || !user) return;

  const storeOwnerUid = resolveStoreOwnerUidForStaffWrite();
  const payload = serializeProduct(product, storeOwnerUid);
  const ref = doc(db, 'products', payload.id);
  try {
    try {
      if (isCurrentUserOwner(user)) {
        const { id: _id, ...updatable } = payload;
        await updateDoc(ref, { ...updatable, updatedAt: serverTimestamp() });
      } else {
        const { id: _id, storeOwnerUid: _so, ...updatable } = payload;
        await updateDoc(ref, { ...updatable, updatedAt: serverTimestamp() });
      }
    } catch (err) {
      if (isNotFoundError(err)) {
        await setDoc(ref, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        throw err;
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `products/${payload.id}`);
  }
}

export async function syncProductStockToCloud(
  productId: string,
  currentBaseStock: number
): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!canPerformCloudStaffWrite(user)) return;

  const id = safeId(productId, 'prod');
  try {
    await updateDoc(doc(db, 'products', id), {
      currentBaseStock: safeNumber(currentBaseStock, 0, 0, 1000000),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (!isNotFoundError(error)) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${id}`);
    }
  }
}

export async function deleteProductFromCloud(productId: string): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!canPerformCloudStaffWrite(user)) return;

  const id = safeId(productId, 'prod');
  try {
    await deleteDoc(doc(db, 'products', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
  }
}

export async function syncVasilhameToCloud(vasilhame: VasilhameControl): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!canPerformCloudStaffWrite(user) || !user) return;

  const storeOwnerUid = resolveStoreOwnerUidForStaffWrite();
  const payload = serializeVasilhame(vasilhame, storeOwnerUid);
  const ref = doc(db, 'vasilhames', payload.id);
  try {
    try {
      if (isCurrentUserOwner(user)) {
        const { id: _id, ...updatable } = payload;
        await updateDoc(ref, { ...updatable, updatedAt: serverTimestamp() });
      } else {
        const { id: _id, storeOwnerUid: _so, ...updatable } = payload;
        await updateDoc(ref, { ...updatable, updatedAt: serverTimestamp() });
      }
    } catch (err) {
      if (isNotFoundError(err)) {
        await setDoc(ref, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        throw err;
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `vasilhames/${payload.id}`);
  }
}

export async function syncVasilhameCountersToCloud(vasilhame: VasilhameControl): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!canPerformCloudStaffWrite(user)) return;

  const id = safeId(vasilhame.id, 'vas');
  try {
    await updateDoc(doc(db, 'vasilhames', id), {
      fullInStorage: safeNumber(vasilhame.fullInStorage, 0, 0, 1000000),
      emptyInYard: safeNumber(vasilhame.emptyInYard, 0, 0, 1000000),
      totalInCirculationWithCustomers: safeNumber(
        vasilhame.totalInCirculationWithCustomers,
        0,
        0,
        1000000
      ),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (!isNotFoundError(error)) {
      handleFirestoreError(error, OperationType.UPDATE, `vasilhames/${id}`);
    }
  }
}

export async function syncMotoboyToCloud(
  motoboy: Motoboy,
  staffEmails: string[],
  runtimeOnly = false
): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!canPerformCloudStaffWrite(user)) return;

  const storeOwnerUid = resolveStoreOwnerUidForStaffWrite();
  const payload = serializeMotoboy(motoboy, staffEmails, storeOwnerUid);
  const ref = doc(db, 'motoboys', payload.id);
  try {
    if (runtimeOnly) {
      await updateDoc(ref, {
        isOnline: payload.isOnline,
        activeDeliveriesCount: payload.activeDeliveriesCount,
        totalDeliveriesCompletedToday: payload.totalDeliveriesCompletedToday,
        totalCollectedCash: payload.totalCollectedCash,
        totalCollectedCard: payload.totalCollectedCard,
        totalCollectedPix: payload.totalCollectedPix,
        commissionBalance: payload.commissionBalance,
        updatedAt: serverTimestamp(),
      });
      return;
    }

    try {
      const { id: _id, ...updatable } = payload;
      await updateDoc(ref, { ...updatable, updatedAt: serverTimestamp() });
    } catch (err) {
      if (isNotFoundError(err)) {
        await setDoc(ref, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        throw err;
      }
    }
  } catch (error) {
    if (!isNotFoundError(error)) {
      handleFirestoreError(error, OperationType.WRITE, `motoboys/${payload.id}`);
    }
  }
}

export async function deleteMotoboyFromCloud(motoboyId: string): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!user || !user.emailVerified || !isCurrentUserOwner(user)) return;

  const id = safeId(motoboyId, 'moto');
  try {
    await deleteDoc(doc(db, 'motoboys', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `motoboys/${id}`);
  }
}

export async function syncOrderCreateToCloud(
  order: Order,
  staffEmails: string[]
): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!canPerformCloudStaffWrite(user)) return;

  const storeOwnerUid = activeStoreOwnerUid || (await fetchPublicStoreOwnerUid()) || '';
  const payload = serializeOrder(order, staffEmails, storeOwnerUid);
  try {
    await setDoc(doc(db, 'orders', payload.id), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `orders/${payload.id}`);
  }
}

export async function syncOrderUpdateToCloud(
  order: Order,
  staffEmails: string[],
  messagesOnly = false
): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!canPerformCloudStaffWrite(user)) return;

  const storeOwnerUid = resolveStoreOwnerUidForStaffWrite();
  const payload = serializeOrder(order, staffEmails, storeOwnerUid);
  const ref = doc(db, 'orders', payload.id);
  try {
    if (messagesOnly) {
      await updateDoc(ref, {
        messages: payload.messages,
        updatedAt: serverTimestamp(),
      });
      return;
    }

    try {
      await updateDoc(ref, {
        status: payload.status,
        motoboyId: payload.motoboyId,
        motoboyName: payload.motoboyName,
        motoboyAssignedAt: payload.motoboyAssignedAt,
        deliveredAt: payload.deliveredAt,
        messages: payload.messages,
        canceledAt: payload.canceledAt,
        canceledBy: payload.canceledBy,
        cancelReason: payload.cancelReason,
        staffEmails: payload.staffEmails,
        ...(isCurrentUserOwner(user) ? { staffUids: payload.staffUids } : {}),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      if (isNotFoundError(err)) {
        await setDoc(ref, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        throw err;
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${payload.id}`);
  }
}

export async function syncOrderStaffEmailsToCloud(
  orderId: string,
  staffEmails: string[]
): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!user || !user.emailVerified || !isCurrentUserOwner(user)) return;

  const id = safeId(orderId, 'ord');
  try {
    await updateDoc(doc(db, 'orders', id), {
      staffEmails: sanitizeStaffEmails(staffEmails),
      staffUids: sanitizeStaffUids(activeStaffUids),
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Non-critical background fanout
  }
}

export async function syncTableToCloud(
  table: TableTab,
  staffEmails: string[]
): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!canPerformCloudStaffWrite(user) || !user) return;

  const storeOwnerUid = resolveStoreOwnerUidForStaffWrite();
  const payload = serializeTableTab(table, staffEmails, storeOwnerUid);
  const ref = doc(db, 'tables', payload.id);
  try {
    try {
      const {
        id: _id,
        openedAt: _oa,
        openedBy: _ob,
        storeOwnerUid: _so,
        numberOrLabel: _nl,
        staffEmails: _se,
        staffUids: _su,
        ...staffUpdatable
      } = payload;
      await updateDoc(ref, {
        ...staffUpdatable,
        ...(isCurrentUserOwner(user)
          ? {
              numberOrLabel: payload.numberOrLabel,
              staffEmails: payload.staffEmails,
              staffUids: payload.staffUids,
            }
          : {}),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      if (isNotFoundError(err)) {
        await setDoc(ref, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        throw err;
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `tables/${payload.id}`);
  }
}

export async function deleteTableFromCloud(tableId: string): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!canPerformCloudStaffWrite(user)) return;

  const id = safeId(tableId, 'MESA');
  try {
    await deleteDoc(doc(db, 'tables', id));
  } catch (error) {
    if (!isNotFoundError(error)) {
      handleFirestoreError(error, OperationType.DELETE, `tables/${id}`);
    }
  }
}

export async function syncCashShiftToCloud(
  shift: CashShift,
  staffEmails: string[]
): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!canPerformCloudStaffWrite(user) || !user) return;

  const storeOwnerUid = resolveStoreOwnerUidForStaffWrite();
  const payload = serializeCashShift(shift, staffEmails, storeOwnerUid);
  const ref = doc(db, 'cashShifts', payload.id);
  try {
    try {
      await updateDoc(ref, {
        status: payload.status,
        closedAt: payload.closedAt,
        balcaoCash: payload.balcaoCash,
        balcaoCard: payload.balcaoCard,
        balcaoPix: payload.balcaoPix,
        deliveryCash: payload.deliveryCash,
        deliveryCard: payload.deliveryCard,
        deliveryPix: payload.deliveryPix,
        closingCashInDrawer: payload.closingCashInDrawer,
        closingDifference: payload.closingDifference,
        closingNotes: payload.closingNotes,
        ...(isCurrentUserOwner(user)
          ? {
              cashierName: payload.cashierName,
              staffEmails: payload.staffEmails,
              staffUids: payload.staffUids,
            }
          : {}),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      if (isNotFoundError(err)) {
        await setDoc(ref, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        throw err;
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `cashShifts/${payload.id}`);
  }
}

export async function syncShiftRecordCreateToCloud(
  record: CashShiftRecord,
  staffEmails: string[]
): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!canPerformCloudStaffWrite(user)) return;

  const storeOwnerUid = resolveStoreOwnerUidForStaffWrite();
  const payload = serializeShiftRecord(record, staffEmails, storeOwnerUid);
  try {
    await setDoc(doc(db, 'shiftHistory', payload.id), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `shiftHistory/${payload.id}`);
  }
}

export async function syncStockMovementCreateToCloud(
  movement: StockMovement,
  staffEmails: string[]
): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!canPerformCloudStaffWrite(user)) return;

  const storeOwnerUid = activeStoreOwnerUid || (await fetchPublicStoreOwnerUid()) || '';
  const payload = serializeStockMovement(movement, staffEmails, storeOwnerUid);
  try {
    await setDoc(doc(db, 'stockMovements', payload.id), {
      ...payload,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `stockMovements/${payload.id}`);
  }
}

// =========================================================================
// SINCRONIZAÇÃO INICIAL / UPLOAD COMPLETO DA LOJA PARA A NUVEM
// =========================================================================

export async function uploadFullLocalStoreToCloud(
  bundle: FullStoreCloudBundle
): Promise<{ uploadedCount: number }> {
  const user = firebaseAuth.currentUser;
  if (!user || !user.emailVerified || !isCurrentUserOwner(user)) {
    throw new Error('Conecte com a conta Google do Dono para enviar os dados da loja para a nuvem.');
  }

  const storeOwnerUid = user.uid;
  const staffEmails = sanitizeStaffEmails(bundle.settings.staffEmails, user.email || '');
  await syncStoreSettingsToCloud(bundle.settings);
  await syncStaffAccessListToCloud(staffEmails, bundle.motoboys);

  type BatchOp = { path: string; id: string; data: Record<string, unknown> };
  const ops: BatchOp[] = [];

  for (const p of bundle.products) {
    const sp = serializeProduct(p, storeOwnerUid);
    ops.push({ path: 'products', id: sp.id, data: sp });
  }
  for (const v of bundle.vasilhames) {
    const sv = serializeVasilhame(v, storeOwnerUid);
    ops.push({ path: 'vasilhames', id: sv.id, data: sv });
  }
  for (const m of bundle.motoboys) {
    const sm = serializeMotoboy(m, staffEmails, storeOwnerUid);
    ops.push({ path: 'motoboys', id: sm.id, data: sm });
  }
  for (const t of bundle.tables) {
    const st = serializeTableTab(t, staffEmails, storeOwnerUid);
    ops.push({ path: 'tables', id: st.id, data: st });
  }
  for (const o of bundle.orders.slice(0, 150)) {
    if (!o.items || o.items.length === 0) continue;
    const so = serializeOrder(o, staffEmails, storeOwnerUid);
    ops.push({ path: 'orders', id: so.id, data: so });
  }
  if (bundle.cashShift && bundle.cashShift.id) {
    const cs = serializeCashShift(bundle.cashShift, staffEmails, storeOwnerUid);
    ops.push({ path: 'cashShifts', id: cs.id, data: cs });
  }
  for (const r of bundle.shiftHistory.slice(0, 50)) {
    const sr = serializeShiftRecord(r, staffEmails, storeOwnerUid);
    ops.push({ path: 'shiftHistory', id: sr.id, data: sr });
  }

  const CHUNK = 350;
  for (let i = 0; i < ops.length; i += CHUNK) {
    const batch = writeBatch(db);
    const slice = ops.slice(i, i + CHUNK);
    for (const op of slice) {
      batch.set(doc(db, op.path, op.id), {
        ...op.data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }

  for (const cf of bundle.cashFlows.slice(0, 100)) {
    await syncCashFlowToFirestore(cf, staffEmails);
  }

  return { uploadedCount: ops.length + bundle.cashFlows.length };
}

export async function seedCloudIfEmptyForOwner(
  bundle: FullStoreCloudBundle
): Promise<boolean> {
  const user = firebaseAuth.currentUser;
  if (!user || !user.emailVerified || !isCurrentUserOwner(user)) return false;

  try {
    const checkSnap = await getDocs(query(collection(db, 'products'), limit(1)));
    if (checkSnap.empty) {
      await uploadFullLocalStoreToCloud(bundle);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
