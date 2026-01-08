// Teste da Jina Reader API
// Execute este arquivo para testar a extração de conteúdo

const testUrl = "https://stackoverflow.com/questions/11227809/why-is-processing-a-sorted-array-faster-than-processing-an-unsorted-array";

async function testJinaReader() {
    console.log("🧪 Testando Jina Reader API...\n");

    const jinaUrl = `https://r.jina.ai/${testUrl}`;

    console.log(`📝 URL Original: ${testUrl}`);
    console.log(`🔗 Jina URL: ${jinaUrl}\n`);

    try {
        console.log("⏳ Fazendo requisição...");
        const response = await fetch(jinaUrl, {
            headers: {
                "Accept": "text/markdown",
                "User-Agent": "Mozilla/5.0 (compatible; ContentExtractor/1.0)",
            },
        });

        console.log(`📡 Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            console.error("❌ Erro na requisição");
            return;
        }

        const markdown = await response.text();
        const wordCount = markdown.split(/\s+/).filter(w => w.length > 0).length;

        console.log(`\n✅ Sucesso!`);
        console.log(`📊 Palavras extraídas: ${wordCount}`);
        console.log(`📄 Tamanho: ${(markdown.length / 1024).toFixed(2)} KB`);
        console.log(`\n📖 Primeiros 500 caracteres do Markdown:\n`);
        console.log("─".repeat(60));
        console.log(markdown.substring(0, 500));
        console.log("─".repeat(60));
        console.log("\n✅ Jina Reader está FUNCIONANDO corretamente!");

    } catch (error) {
        console.error("❌ Erro:", error.message);
    }
}

// Executar teste
testJinaReader();
