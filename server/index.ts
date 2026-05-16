import 'dotenv/config';
import { InferenceClient } from '@huggingface/inference';
import {
  createClient,
  RealtimePostgresInsertPayload,
} from '@supabase/supabase-js';
import { SOCRATES_PROMPT } from './socrates.js';

// ── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  message: string;
  userid: string;
  username: string;
  avatarurl: string | null;
  badgetype: string | null;
  parentid: string | null;
  timestamp: string;
  isdeleted: boolean;
  isedited: boolean;
  is_bot: boolean;
}

// ── Config ───────────────────────────────────────────────────────────────────
const BOT_USERNAME = '🏛️ Socrates';
const MENTION_TRIGGER = '@socrates';
const AUTO_FIRE_CHANCE = 0.12; // 12% chance to butt in unprompted
const AUTO_FIRE_COOLDOWN = 90_000; // 90s minimum between auto-fires
const MAX_CONTEXT = 10; // recent messages sent as context
const MAX_TOKENS = 120; // keep replies short and sharp
const HF_MODEL = 'mistralai/Mistral-7B-Instruct-v0.3'; // swap any HF chat model here

// ── Clients ───────────────────────────────────────────────────────────────────
const hf = new InferenceClient(process.env.HF_TOKEN!);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

let lastAutoFire = 0;

// ── Core AI function ──────────────────────────────────────────────────────────
async function triggerSocrates(): Promise<void> {
  try {
    const { data: history, error } = await supabase
      .from('messages')
      .select('username, message')
      .eq('isdeleted', false)
      .eq('is_bot', false)
      .order('timestamp', { ascending: false })
      .limit(MAX_CONTEXT);

    if (error) throw error;

    const contextMessages = (
      (history as Pick<Message, 'username' | 'message'>[]) ?? []
    )
      .reverse()
      .map((m) => ({
        role: 'user' as const,
        content: `${m.username}: ${m.message.replace(/<[^>]*>/g, '')}`,
      }));

    const response = await hf.chatCompletion({
      model: HF_MODEL,
      messages: [
        { role: 'system', content: SOCRATES_PROMPT },
        ...contextMessages,
      ],
      max_tokens: MAX_TOKENS,
    });

    const reply = response.choices[0].message.content ?? '...';

    await supabase.from('messages').insert({
      message: reply,
      userid: '00000000-0000-0000-0000-000000000000',
      username: BOT_USERNAME,
      avatarurl: null,
      badgetype: null,
      parentid: null,
      isdeleted: false,
      isedited: false,
      is_bot: true,
      timestamp: new Date().toISOString(),
    });

    console.log(`[Socrates]: ${reply}`);
  } catch (err) {
    console.error('[Socrates error]', (err as Error).message);
  }
}

// ── Realtime listener ─────────────────────────────────────────────────────────
supabase
  .channel('socrates-watcher')
  .on<Message>(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    async (payload: RealtimePostgresInsertPayload<Message>) => {
      const msg = payload.new;
      if (msg.is_bot) return;

      const rawText = msg.message?.toLowerCase() ?? '';
      const mentioned = rawText.includes(MENTION_TRIGGER);
      const now = Date.now();
      const cooldownOk = now - lastAutoFire > AUTO_FIRE_COOLDOWN;
      const autoFire = cooldownOk && Math.random() < AUTO_FIRE_CHANCE;

      if (mentioned || autoFire) {
        if (autoFire && !mentioned) lastAutoFire = now;
        console.log(
          `[Socrates] Triggered by: ${mentioned ? '@mention' : 'auto-fire'}`,
        );
        await triggerSocrates();
      }
    },
  )
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('🏛️ Socrates is watching Crooms Connect...');
    }
  });
