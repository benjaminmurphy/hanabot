import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";

const { OPENAI_API_KEY } = process.env;

const configuration = new Configuration({
  organization: 'org-bq83Kivlg5vHtV1uYreLkuwP',
  apiKey: OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export const evaluate = async (prompt: ChatCompletionRequestMessage[]) => {
  // console.log(OPENAI_API_KEY)
  return await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: prompt,
    temperature: 0.9,
    n: 1,
  });
}

