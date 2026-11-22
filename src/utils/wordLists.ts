// Word lists, quotes, code snippets, and Indian/Hinglish packs

export const COMMON_WORDS: string[] = `the be of and a to in he have it that for they with as not on she at by this we you do but from or which one would all will there say who make when can more if no man out other so what time up go about than into could state only new year some take come these know see use get like then first any work now may such give over think most even find day also after way many must look before great back through long where much should well people down own just because good each those feel seem how high too place little world very still nation hand old life tell write become here show house both case need part high during without again hold around small yet move face like every need left fact group own problem stand point late run home kind play kind small sense sort point turn head stand light power light money team minute light kind field hold rest start present art since study try stand road water round area mark game kept base course table start party grow father east plant air black rock ago fire south true force music foot walk river car city act mind team eye star rock front war week cent note north river ship sound foot stone road care eat room season root art hair fresh map winter cell ball scale dropped spring touch force view cross foot party joy`.split(/\s+/).filter(Boolean);

export const PUNCTUATION_WORDS: string[] = COMMON_WORDS;

export const NUMBER_WORDS: string[] = COMMON_WORDS;

export const INDIAN_WORDS: string[] = `auto-rickshaw lakh crore rupee paisa namaste chai roti dal sabzi kurta saree dhoti diya rangoli bindi Mehndi holi diwali onam pongal vada idli dosa sambar biryani masala paneer ghee lassi jaggery acharya ashram ghats bazaar gully jhuggi chowk mohalla pradhan sarpanch panchayat tehsil zila vidhayak sansad mantri sarkar neta jhakaas bindaas timepass funda jugaad yaar bhai dost yaaron achha theek hai bilkul Kashmiri Punjabi Gujarati Marathi Bengali Tamil Telugu Kannada Malayalam startup unicorn founder pivot scale funding venture angel seed Series bootstrapped IPO traction runway burn runway ESOP acqui-hire pivot scale disrupt tier-2 tier-3 UPI NEFT RTGS Aadhaar GST TDS PAN DEMAT khaana shaadi baraati phool mala diya aarti bhajan prasad mandir gurdwara masjid church pandit granthi maulvi puja vrath vrat`.split(/\s+/).filter(Boolean);

export const HINGLISH_WORDS: string[] = `kya kaise kahan kab kyun mat kar na bhai yaar dost bilkul theek hai achha bahut sunna dekhna bolna jaana aana karna lena dena khana peena sona uthna baithna chalna bolna likhna padhna samajhna jaanna manna chaahna rakhna chhodna lena dena thoda bahut zyada kam fast slow khaana paani raat din shaam dopahar subah kal aaj phir kabhi kabhi bhi lekin magar toh hi na mat nahi haan bilkul exactly sahi galat mast bindaas jhakaas timepass funda jugaad scene hai ki nai le de ke bata de bhaiya didi aunty uncle padosi chacha mausi bua tau tai beta beti bhabhi devar jeth nanad sala saali`.split(/\s+/).filter(Boolean);

const punctuate = (w: string): string => {
  const r = Math.random();
  if (r < 0.12) return w + ".";
  if (r < 0.18) return w + ",";
  if (r < 0.22) return w + ";";
  if (r < 0.26) return capitalize(w) + ".";
  return w;
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const numify = (w: string): string => {
  if (Math.random() < 0.2) {
    const n = Math.floor(Math.random() * 10000);
    return String(n);
  }
  return w;
};

export function generateWords(
  count: number,
  opts: { punctuation?: boolean; numbers?: boolean; pack?: "common" | "indian" | "hinglish" } = {}
): string[] {
  let pool: string[];
  if (opts.pack === "indian") pool = INDIAN_WORDS;
  else if (opts.pack === "hinglish") pool = HINGLISH_WORDS;
  else pool = COMMON_WORDS;

  const out: string[] = [];
  let last = "";
  for (let i = 0; i < count; i++) {
    let w = pool[Math.floor(Math.random() * pool.length)];
    while (w === last && pool.length > 1) {
      w = pool[Math.floor(Math.random() * pool.length)];
    }
    last = w;
    if (opts.punctuation) w = punctuate(w);
    if (opts.numbers) w = numify(w);
    out.push(w);
  }
  return out;
}

export interface Quote {
  text: string;
  author: string;
  source: string;
  length: "short" | "medium" | "long";
}

export const QUOTES: Quote[] = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs", source: "Stanford Commencement Address", length: "short" },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein", source: "Letter", length: "short" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci", source: "Notebooks", length: "short" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela", source: "Speech", length: "short" },
  { text: "The best time to plant a tree was twenty years ago. The second best time is now.", author: "Chinese Proverb", source: "Proverb", length: "medium" },
  { text: "Do not wait for the perfect moment, take the moment and make it perfect. A journey of a thousand miles begins with a single step forward.", author: "Zoey Sayward", source: "Manuscript", length: "medium" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts. We are what we repeatedly do; excellence, then, is not an act but a habit formed through persistence and care.", author: "Winston Churchill", source: "Speech", length: "long" },
  { text: "The future belongs to those who believe in the beauty of their dreams. Life is what happens when you are busy making other plans, so keep dreaming and keep moving forward with purpose every single day.", author: "Eleanor Roosevelt", source: "Essay", length: "long" },
  { text: "Stay hungry, stay foolish. Your time is limited, so don't waste it living someone else's life. Have the courage to follow your heart and intuition; they somehow already know what you truly want to become.", author: "Steve Jobs", source: "Stanford Commencement", length: "long" },
  { text: "Innovation distinguishes between a leader and a follower. The people who are crazy enough to think they can change the world are the ones who do.", author: "Steve Jobs", source: "Apple Campaign", length: "medium" },
  { text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House", source: "Tweet", length: "short" },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson", source: "Engineering Notes", length: "short" },
];

export function getQuote(length: "short" | "medium" | "long"): Quote {
  const pool = QUOTES.filter((q) => q.length === length);
  return pool[Math.floor(Math.random() * pool.length)] || QUOTES[0];
}

export interface CodeSnippet {
  text: string;
  language: string;
  label: string;
}

export const CODE_SNIPPETS: CodeSnippet[] = [
  {
    language: "JavaScript",
    label: "js",
    text: `function fetchUser(id) {
  return fetch(\`/api/users/\${id}\`)
    .then(res => res.json())
    .then(data => {
      console.log("User:", data.name);
      return data;
    })
    .catch(err => {
      console.error("Failed:", err);
      return null;
    });
}`,
  },
  {
    language: "TypeScript",
    label: "ts",
    text: `interface User {
  id: number;
  name: string;
  email?: string;
}

const createUser = (data: User): User => {
  const user: User = {
    id: Math.floor(Math.random() * 1000),
    name: data.name,
    email: data.email,
  };
  return user;
};`,
  },
  {
    language: "Python",
    label: "py",
    text: `def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quick_sort(left) + middle + quick_sort(right)`,
  },
  {
    language: "HTML/CSS",
    label: "html",
    text: `<div class="card">
  <h2>Hello World</h2>
  <p>Welcome to the page.</p>
</div>

<style>
  .card {
    padding: 24px;
    border-radius: 12px;
    background: #f5f5f5;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
</style>`,
  },
  {
    language: "C++",
    label: "cpp",
    text: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> nums = {1, 2, 3, 4, 5};
    int sum = 0;
    for (int n : nums) {
        sum += n;
    }
    std::cout << "Sum: " << sum << std::endl;
    return 0;
}`,
  },
  {
    language: "SQL",
    label: "sql",
    text: `SELECT u.id, u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at >= '2024-01-01'
GROUP BY u.id, u.name
HAVING COUNT(o.id) > 5
ORDER BY order_count DESC
LIMIT 20;`,
  },
];

export function getCodeSnippet(lang: string): CodeSnippet {
  if (lang === "random") {
    return CODE_SNIPPETS[Math.floor(Math.random() * CODE_SNIPPETS.length)];
  }
  const pool = CODE_SNIPPETS.filter((c) => c.language === lang || c.label === lang);
  return pool[Math.floor(Math.random() * pool.length)] || CODE_SNIPPETS[0];
}

// Generate a weighted weakness-drill session from the user's weakest keys.
export function generateWeaknessWords(weakKeys: string[], count: number): string[] {
  if (weakKeys.length === 0) return generateWords(count);
  const lower = weakKeys.map((k) => k.toLowerCase());
  const weighted = COMMON_WORDS.filter((w) => lower.some((k) => w.toLowerCase().includes(k)));
  const pool = weighted.length >= 10 ? weighted : [...weighted, ...COMMON_WORDS];
  const out: string[] = [];
  let last = "";
  for (let i = 0; i < count; i++) {
    let w = pool[Math.floor(Math.random() * pool.length)];
    while (w === last && pool.length > 1) w = pool[Math.floor(Math.random() * pool.length)];
    last = w;
    // Boost: sometimes inject a word that starts with a weak key
    if (Math.random() < 0.3) {
      const k = lower[Math.floor(Math.random() * lower.length)];
      const starters = COMMON_WORDS.filter((w2) => w2.toLowerCase().startsWith(k));
      if (starters.length) w = starters[Math.floor(Math.random() * starters.length)];
    }
    out.push(w);
  }
  return out;
}
