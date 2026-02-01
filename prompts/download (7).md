[Collections](https://openrouter.ai/collections)/Free Models

At OpenRouter, we believe that free models play a crucial role in democratizing access to AI. These models allow hundreds of thousands of users worldwide to experiment, learn, and innovate. Below you will find the top free AI models currently available on OpenRouter.

We are continuing to actively expand our free model capacity by onboarding new providers and directly covering costs to help promote freely accessible models. While we can't guarantee what the future holds, we will continue to support free inference options on our platform.

## Top Free Models on OpenRouter

Devstral 2 is a state-of-the-art open-source model by Mistral AI specializing in agentic coding. It is a 123B-parameter dense transformer model supporting a 256K context window.

Devstral 2 supports exploring codebases and orchestrating changes across multiple files while maintaining architecture-level context. It tracks framework dependencies, detects failures, and retries with corrections—solving challenges like bug fixing and modernizing legacy systems. The model can be fine-tuned to prioritize specific languages or optimize for large enterprise codebases. It is available under a modified MIT license.

by [mistralai](https://openrouter.ai/mistralai)262K context$0/M input tokens$0/M output tokens

DeepSeek-TNG-R1T2-Chimera is the second-generation Chimera model from TNG Tech. It is a 671 B-parameter mixture-of-experts text-generation model assembled from DeepSeek-AI’s R1-0528, R1, and V3-0324 checkpoints with an Assembly-of-Experts merge. The tri-parent design yields strong reasoning performance while running roughly 20 % faster than the original R1 and more than 2× faster than R1-0528 under vLLM, giving a favorable cost-to-intelligence trade-off. The checkpoint supports contexts up to 60 k tokens in standard use (tested to ~130 k) and maintains consistent <think> token behaviour, making it suitable for long-context analysis, dialogue and other open-ended generation tasks.

by [tngtech](https://openrouter.ai/tngtech)164K context$0/M input tokens$0/M output tokens

DeepSeek-R1T-Chimera is created by merging DeepSeek-R1 and DeepSeek-V3 (0324), combining the reasoning capabilities of R1 with the token efficiency improvements of V3. It is based on a DeepSeek-MoE Transformer architecture and is optimized for general text generation tasks.

The model merges pretrained weights from both source models to balance performance across reasoning, efficiency, and instruction-following tasks. It is released under the MIT license and intended for research and commercial use.

by [tngtech](https://openrouter.ai/tngtech)164K context$0/M input tokens$0/M output tokens

GLM-4.5-Air is the lightweight variant of our latest flagship model family, also purpose-built for agent-centric applications. Like GLM-4.5, it adopts the Mixture-of-Experts (MoE) architecture but with a more compact parameter size. GLM-4.5-Air also supports hybrid inference modes, offering a "thinking mode" for advanced reasoning and tool use, and a "non-thinking mode" for real-time interaction. Users can control the reasoning behaviour with the `reasoning` `enabled` boolean. Learn more in our docs

by [z-ai](https://openrouter.ai/z-ai)131K context$0/M input tokens$0/M output tokens

May 28th update to the original DeepSeek R1 Performance on par with OpenAI o1, but open-sourced and with fully open reasoning tokens. It's 671B parameters in size, with 37B active in an inference pass.

Fully open-source model.

by [deepseek](https://openrouter.ai/deepseek)164K context$0/M input tokens$0/M output tokens

TNG-R1T-Chimera is an experimental LLM with a faible for creative storytelling and character interaction. It is a derivate of the original TNG/DeepSeek-R1T-Chimera released in April 2025 and is available exclusively via Chutes and OpenRouter.

Characteristics and improvements include:

We think that it has a creative and pleasant personality. It has a preliminary EQ-Bench3 value of about 1305. It is quite a bit more intelligent than the original, albeit a slightly slower. It is much more think-token consistent, i.e. reasoning and answer blocks are properly delineated. Tool calling is much improved.

TNG Tech, the model authors, ask that users follow the careful guidelines that Microsoft has created for their "MAI-DS-R1" DeepSeek-based model. These guidelines are available on Hugging Face (https://huggingface.co/microsoft/MAI-DS-R1).

by [tngtech](https://openrouter.ai/tngtech)164K context$0/M input tokens$0/M output tokens

The Meta Llama 3.3 multilingual large language model (LLM) is a pretrained and instruction tuned generative model in 70B (text in/text out). The Llama 3.3 instruction tuned text only model is optimized for multilingual dialogue use cases and outperforms many of the available open source and closed chat models on common industry benchmarks.

Supported languages: English, German, French, Italian, Portuguese, Hindi, Spanish, and Thai.

Model Card

by [meta-llama](https://openrouter.ai/meta-llama)131K context$0/M input tokens$0/M output tokens

NVIDIA Nemotron 3 Nano 30B A3B is a small language MoE model with highest compute efficiency and accuracy for developers to build specialized agentic AI systems.

The model is fully open with open-weights, datasets and recipes so developers can easily customize, optimize, and deploy the model on their infrastructure for maximum privacy and security.

Note: For the free endpoint, all prompts and output are logged to improve the provider's model and its product and services. Please do not upload any personal, confidential, or otherwise sensitive information. This is a trial use only. Do not use for production or business-critical systems.

by [nvidia](https://openrouter.ai/nvidia)256K context$0/M input tokens$0/M output tokens

Qwen3-Coder-480B-A35B-Instruct is a Mixture-of-Experts (MoE) code generation model developed by the Qwen team. It is optimized for agentic coding tasks such as function calling, tool use, and long-context reasoning over repositories. The model features 480 billion total parameters, with 35 billion active per forward pass (8 out of 160 experts).

Pricing for the Alibaba endpoints varies by context length. Once a request is greater than 128k input tokens, the higher pricing is used.

by [qwen](https://openrouter.ai/qwen)262K context$0/M input tokens$0/M output tokens

Gemma 3 introduces multimodality, supporting vision-language input and text outputs. It handles context windows up to 128k tokens, understands over 140 languages, and offers improved math, reasoning, and chat capabilities, including structured outputs and function calling. Gemma 3 27B is Google's latest open source model, successor to Gemma 2

by [google](https://openrouter.ai/google)131K context$0/M input tokens$0/M output tokens

gpt-oss-120b is an open-weight, 117B-parameter Mixture-of-Experts (MoE) language model from OpenAI designed for high-reasoning, agentic, and general-purpose production use cases. It activates 5.1B parameters per forward pass and is optimized to run on a single H100 GPU with native MXFP4 quantization. The model supports configurable reasoning depth, full chain-of-thought access, and native tool use, including function calling, browsing, and structured output generation.

by [openai](https://openrouter.ai/openai)131K context$0/M input tokens$0/M output tokens

Gemini Flash 2.0 offers a significantly faster time to first token (TTFT) compared to Gemini Flash 1.5, while maintaining quality on par with larger models like Gemini Pro 1.5. It introduces notable enhancements in multimodal understanding, coding capabilities, complex instruction following, and function calling. These advancements come together to deliver more seamless and robust agentic experiences.

by [google](https://openrouter.ai/google)1,05M context$0/M input tokens$0/M output tokens

Seedream 4.5 is the latest in-house image generation model developed by ByteDance. Compared with Seedream 4.0, it delivers comprehensive improvements, especially in editing consistency, including better preservation of subject details, lighting, and color tone. It also enhances portrait refinement and small-text rendering. The model’s multi-image composition capabilities have been significantly strengthened, and both reasoning performance and visual aesthetics continue to advance, enabling more accurate and artistically expressive image generation.

Pricing is $0.04 per output image, regardless of size.

by [bytedance-seed](https://openrouter.ai/bytedance-seed)4K context$0/M input tokens$0/M output tokens$40.000/M tokens

gpt-oss-20b is an open-weight 21B parameter model released by OpenAI under the Apache 2.0 license. It uses a Mixture-of-Experts (MoE) architecture with 3.6B active parameters per forward pass, optimized for lower-latency inference and deployability on consumer or single-GPU hardware. The model is trained in OpenAI’s Harmony response format and supports reasoning level configuration, fine-tuning, and agentic capabilities including function calling, tool use, and structured outputs.

by [openai](https://openrouter.ai/openai)131K context$0/M input tokens$0/M output tokens

Trinity Mini is a 26B-parameter (3B active) sparse mixture-of-experts language model featuring 128 experts with 8 active per token. Engineered for efficient reasoning over long contexts (131k) with robust function calling and multi-step agent workflows.

by [arcee-ai](https://openrouter.ai/arcee-ai)131K context$0/M input tokens$0/M output tokens

Qwen3-Next-80B-A3B-Instruct is an instruction-tuned chat model in the Qwen3-Next series optimized for fast, stable responses without “thinking” traces. It targets complex tasks across reasoning, code generation, knowledge QA, and multilingual use, while remaining robust on alignment and formatting. Compared with prior Qwen3 instruct variants, it focuses on higher throughput and stability on ultra-long inputs and multi-turn dialogues, making it well-suited for RAG, tool use, and agentic workflows that require consistent final answers rather than visible chain-of-thought.

The model employs scaling-efficient training and decoding to improve parameter efficiency and inference speed, and has been validated on a broad set of public benchmarks where it reaches or approaches larger Qwen3 systems in several categories while outperforming earlier mid-sized baselines. It is best used as a general assistant, code helper, and long-context task solver in production settings where deterministic, instruction-following outputs are preferred.

by [qwen](https://openrouter.ai/qwen)262K context$0/M input tokens$0/M output tokens