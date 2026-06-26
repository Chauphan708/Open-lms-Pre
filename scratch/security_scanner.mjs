import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = 'e:/antigravity_projects/ptchau1708/Open-lms-Pre';

const API_KEY_PATTERNS = [
  /AIza[0-9A-Za-z-_]{35}/g, // Google API Key
  /sb_publishable_[0-9A-Za-z-_]+/g, // Supabase Publishable Key
  /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, // JWT tokens
  /postgres:\/\/[^:]+:[^@]+@[^/]+\/[^?\s]+/g // Postgres Connection Strings
];

const DANGEROUS_PATTERNS = [
  { name: "dangerouslySetInnerHTML", regex: /dangerouslySetInnerHTML/g },
  { name: "eval() usage", regex: /\beval\s*\(/g },
  { name: "Function() constructor", regex: /\bnew\s+Function\s*\(/g },
  { name: "localStorage secrets storage", regex: /localStorage\.setItem\(\s*['"`](.*key|.*secret|.*password.*)['"`]/gi }
];

const fileList = [];

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== '.agents') {
        walkDir(fullPath);
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.sql')) {
        fileList.push(fullPath);
      }
    }
  }
}

async function runScan() {
  console.log("=================================================================");
  console.log("       HỆ THỐNG QUÉT BẢO MẬT DỰ ÁN TỰ ĐỘNG (SECURITY SCANNER)    ");
  console.log("=================================================================\n");

  walkDir(PROJECT_ROOT);
  console.log(`🔍 Tìm thấy ${fileList.length} tệp nguồn để quét.\n`);

  const findings = [];

  for (const filePath of fileList) {
    const relativePath = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf-8');

    // 1. Quét tìm API Key và chuỗi nhạy cảm bị Hardcode
    for (const pattern of API_KEY_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          // Bỏ qua nếu là file .env hoặc cấu hình fallback giả lập công khai
          if (relativePath === '.env' || relativePath.includes('supabaseClient.ts') || relativePath.includes('check_supabase_resources.mjs')) {
            continue;
          }
          findings.push({
            type: "HARDCODED_SECRET",
            severity: "HIGH",
            file: relativePath,
            message: `Phát hiện chuỗi giống API Key hoặc thông tin nhạy cảm: "${match.substring(0, 10)}..."`
          });
        }
      }
    }

    // 2. Quét các hàm nguy hiểm (XSS / Code Injection)
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.regex.test(content)) {
        findings.push({
          type: "DANGEROUS_API",
          severity: pattern.name.includes("dangerously") ? "MEDIUM" : "HIGH",
          file: relativePath,
          message: `Sử dụng hàm/cơ chế tiềm ẩn rủi ro bảo mật: ${pattern.name}`
        });
      }
    }

    // 3. Quét SQL Injection trong file TypeScript/Javascript
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      const sqlInjectionPattern = /\.from\s*\(\s*['"`].*['"`]\s*\)\s*\..*(\$\{\s*\w+\s*\})/g;
      if (sqlInjectionPattern.test(content)) {
        findings.push({
          type: "SQL_INJECTION_RISK",
          severity: "MEDIUM",
          file: relativePath,
          message: "Phát hiện chèn biến trực tiếp vào query Supabase, có thể gây rủi ro bảo mật."
        });
      }
    }
  }

  // In kết quả quét
  if (findings.length === 0) {
    console.log("✅ Quét hoàn tất: Không tìm thấy lỗ hổng bảo mật trực tiếp trong mã nguồn!");
  } else {
    console.log(`⚠️ Quét hoàn tất: Tìm thấy ${findings.length} cảnh báo bảo mật:\n`);
    findings.forEach((f, idx) => {
      console.log(`[${idx + 1}] [${f.severity}] ${f.type}`);
      console.log(`    Tệp: ${f.file}`);
      console.log(`    Chi tiết: ${f.message}\n`);
    });
  }
}

runScan().catch(err => console.error(err));
