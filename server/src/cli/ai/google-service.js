import {google} from '@ai-sdk/google'
import { generateObject, streamText} from 'ai'
import {config} from "../../config/google.config.js"
import chalk from 'chalk'

export class AIService{
    constructor(){
        if(!config.googleApiKey){
            throw new Error("googleApiKey is not set in env")
        }
        this.model = google(config.model, {
            apiKey : config.googleApiKey,
        })
    }

    /**
     * send a message and gety streaming responser
     * @param {Array} messages
     * @param {Function} onChunk
     * @param {Object} tools
     * @param {Function} onToolCall
     * @param {Promise<Object>}
     * 
     */

    async sendMessage(messages, onChunk, tools = undefined, onToolCall = null){
        try {
            const streamConfig = {
                model: this.model,
                messages: messages,  // ✅
            }

            if(tools && Object.keys(tools).length > 0){
                streamConfig.tools = tools;
                streamConfig.maxSteps = 5
                console.log(chalk.gray(`[DEBUG] Tool enabled: ${Object.keys(tools).join(', ')}`))
            }

            const result = streamText(streamConfig)
            let fullResponse = ""
            for await (const chunk of result.textStream){
                fullResponse += chunk
                if(onChunk){
                    onChunk(chunk)
                }
            }
            const fullResult = result;

            const toolCalls = []
            const toolResults = []

            if(fullResult.steps && Array.isArray(fullResult.steps)){
							for(const step of fullResult.steps){
								if(step.toolCalls && step.toolCalls.length > 0){
									for(const toolCall of step.toolCalls){
										toolCalls.push(toolCall)
										if(onToolCall){
											onToolCall(toolCall)
										}
									}
								}
								if(step.toolResults && step.toolResults.length > 0){
									toolResults.push(...step.toolResults)
								}
							}
						}

            return {
                content : fullResponse,
                finishResponse:fullResult.finishReason,
                usage:fullResult.usage,
								toolCalls,
								toolResults,
								steps:fullResult.steps
            }
        } catch (error) {
            console.error(chalk.red("AI service Error"), error.message)
            throw error
        }
    }

    /**
     * Get a non-streaming ressponse
     * @param {Array} messages
     * @param {Object} tools
     * @param {Promise<string>}
     */
    async getMessage(messages, tools=undefined){
        let fullResponse = ""
        const result = await this.sendMessage(messages, (chunk) => {
            fullResponse += chunk
        }, tools)
        return result.content
    }

    /**
     * Generate structured output using a zod schema
     * @param {Object} schema - Zod Schema
     * @param {string} prompt - Prompt for generation
     * @return {Promise<Object>} Parsed object matching the schema 
     * 
     */

    async generateSTructured(schema, prompt){
        try {
            const result = await generateObject({
                model:this.model,
                schema:schema,
                prompt:prompt
            })

            return result.object
        } catch (error) {
            console.log(chalk.red("AI Sturctured Generation Error:"),error.message)
            throw error
        }
    }
}

