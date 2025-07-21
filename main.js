async function translate(text, from, to, options) {
    const { config, utils } = options;
    const { tauriFetch: fetch } = utils;

    let { apiKey, model = "deepseek-chat", usages = "full", hyphenMode = "on", phraseUsages = "full" } = config;

    // 判断是否为单词（不含空格或连字符短语）
    const isWord = !text.trim().includes(' ');

    // 判断是否为短语（以-开头）
    const isPhrase = hyphenMode === "on" && text.startsWith('-');

    // 连字符模式预处理（转换后仍按单词处理）
    if (hyphenMode === "on" && text.startsWith('-')) {
        text = text.slice(1).replace(/-/g, ' ');
    }

    // 设置默认请求路径
    const requestPath = "https://api.deepseek.com/chat/completions";

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    }

    // 根据是否为单词和配置决定系统提示
    let systemPrompt;
    if (isWord) {
        switch (usages) {
            case "basic":
                systemPrompt = "You are a professional translation engine. First translate the word into a colloquial, professional, elegant and fluent content, without the style of machine translation. Then provide common usages and examples of this word in sentences. You must translate the word content first, then provide usages.";
                break;
            case "full":
                systemPrompt = "You are a professional translation engine. Please provide detailed information about this word including:\n" +
                    "1. Pronunciation: Correct pronunciation including stress, phonetic symbols, linking sounds, weak forms, and silent letters\n" +
                    "2. Meaning: Chinese translation and different parts of speech (noun, verb, adjective etc.) with multiple meanings\n" +
                    "3. Usage: Common collocations, phrases and example sentences\n" +
                    "Present the information in a clear and organized manner.";
                break;
            default: // "none"
                systemPrompt = "You are a professional translation engine, please translate the word into a colloquial, professional, elegant and fluent content, without the style of machine translation. You must only translate the word content, never interpret it.";
        }
    } else if (isPhrase) {
        switch (phraseUsages) {
            case "basic":
                systemPrompt = "You are a professional translation engine. First translate the phrase into a colloquial, professional, elegant and fluent content. Then provide:\n" +
                    "1. Phrase meaning\n" +
                    "2. Common usage examples\n" +
                    "3. Related expressions";
                break;
            case "full":
                systemPrompt = "You are a professional translation engine. Please provide detailed analysis of this phrase including:\n" +
                    "1. Literal meaning of each component\n" +
                    "2. Overall figurative meaning\n" +
                    "3. Common usage scenarios\n" +
                    "4. Similar phrases comparison\n" +
                    "5. Example sentences in different contexts";
                break;
            default: // "none"
                systemPrompt = "You are a professional translation engine, please translate the phrase into a colloquial, professional, elegant and fluent content, without the style of machine translation.";
        }
    } else {
        systemPrompt = "You are a professional translation engine, please translate the text into a colloquial, professional, elegant and fluent content, without the style of machine translation.";
    }

    const body = {
        model: model,  // 使用用户选择的模型
        messages: [
            {
                "role": "system",
                "content": systemPrompt
            },
            {
                "role": "user",
                "content": `Translate into ${to}:\n${text}`
            }
        ],
        temperature: 0.1,
        top_p: 0.99,
        frequency_penalty: 0,
        presence_penalty: 0,
        max_tokens: 2000
    }

    let res = await fetch(requestPath, {
        method: 'POST',
        url: requestPath,
        headers: headers,
        body: {
            type: "Json",
            payload: body
        }
    });

    if (res.ok) {
        let result = res.data;
        return result.choices[0].message.content
            .trim()
            .replace(/^"|"$/g, '')
            .replace(/\*/g, '')
            .replace(/^(\s*)-(?=\s)/gm, '$1•')
            .replace(/^#+\s*/g, '')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/~~(.*?)~~/g, '$1')
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`(.*?)`/g, '$1')
            .replace(/!\[.*?\]\(.*?\)/g, '')
            .replace(/==(.*?)==/g, '$1')
            .replace(/^-{3,}\s*$/gm, '');
    } else {
        throw `Http Request Error\nHttp Status: ${res.status}\n${JSON.stringify(res.data)}`;
    }
}
