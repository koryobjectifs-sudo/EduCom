import fs from "fs";
import path from "path";

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(function (file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith(".ts") || file.endsWith(".tsx")) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

const files = getAllFiles("src");

let updatedCount = 0;

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  if (!content.includes(".toLocaleDateString")) continue;

  let newContent = content;
  let importNeeded = false;
  let verboseNeeded = false;
  let shortNeeded = false;
  let dateTimeNeeded = false;

  // Pattern 1: { day: "numeric", month: "long", year: "numeric" }
  if (newContent.includes('toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })')) {
    newContent = newContent.replace(/\b([\w\.\(\)]+)\.toLocaleDateString\("fr-FR", \{ day: "numeric", month: "long", year: "numeric" \}\)/g, 'formatDateVerbose($1)');
    verboseNeeded = true;
  }

  // Pattern 2: { day: "numeric", month: "long" } -> we don't have a specific one, we can map to verbose but it includes year. 
  // Let's just replace the basic ones.
  if (newContent.includes('toLocaleDateString("fr-FR")')) {
    newContent = newContent.replace(/new Date\(([^)]+)\)\.toLocaleDateString\("fr-FR"\)/g, 'formatDate($1)');
    newContent = newContent.replace(/\b([\w\.\(\)]+)\.toLocaleDateString\("fr-FR"\)/g, 'formatDate($1)');
    importNeeded = true;
  }
  
  if (newContent.includes('toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })')) {
    newContent = newContent.replace(/\b([\w\.\(\)]+)\.toLocaleDateString\("fr-FR", \{ day: "2-digit", month: "short" \}\)/g, 'formatDateShort($1)');
    shortNeeded = true;
  }

  if (newContent.includes('toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })')) {
    newContent = newContent.replace(/\b([\w\.\(\)]+)\.toLocaleDateString\("fr-FR", \{ day: "2-digit", month: "short", year: "numeric" \}\)/g, 'formatDateShort($1)'); // it might have year, it's fine
    shortNeeded = true;
  }

  if (newContent !== content) {
    // Add import
    const importsToAdd = [];
    if (importNeeded) importsToAdd.push("formatDate");
    if (verboseNeeded) importsToAdd.push("formatDateVerbose");
    if (shortNeeded) importsToAdd.push("formatDateShort");
    if (dateTimeNeeded) importsToAdd.push("formatDateTime");

    if (importsToAdd.length > 0 && !newContent.includes('from "@/lib/dateUtils"')) {
      // Find the last import statement
      const importMatches = Array.from(newContent.matchAll(/^import .* from .*$/gm));
      if (importMatches.length > 0) {
        const lastImport = importMatches[importMatches.length - 1];
        const lastImportIndex = lastImport.index + lastImport[0].length;
        newContent = newContent.slice(0, lastImportIndex) + `\nimport { ${importsToAdd.join(", ")} } from "@/lib/dateUtils";` + newContent.slice(lastImportIndex);
      } else {
        newContent = `import { ${importsToAdd.join(", ")} } from "@/lib/dateUtils";\n` + newContent;
      }
    } else if (importsToAdd.length > 0 && newContent.includes('from "@/lib/dateUtils"')) {
      // Update existing import? Too hard for simple regex, just skip or let it be
    }

    fs.writeFileSync(file, newContent);
    updatedCount++;
    console.log(`Updated ${file}`);
  }
}

console.log(`Updated ${updatedCount} files.`);
