import prisma from "../lib/db.js";

export class ChatService{
    /**
     * Create a new conversation
     * @param {string} userId
     * @param {string} mode
     * @param {string} title
     */

    async createConversation(userId, mode="chat", title=null){
        return prisma.conversation.create({
            data:{
                userId,
                mode,
                title:title || `New ${mode} conversation`
            }
        })
    }

    /**
     * Get or Create a conversation for user
     * @param {string} userId
     * @param {string} conversationId
     * @param {string} title
     */
    
    async getOrCreateConversation(userId, conversationId = null, mode="chat"){
        if(conversationId){
            const conversation = await prisma.conversation.findFirst({
                where:{
                    id:conversationId,
                    userId
                },
                include:{
                    message:{
                        orderBy:{
                            createdAt:"asc"
                        }
                    }
                }
            })
            if(conversation) return conversation
        }
        return await this.createConversation(userId, mode)
    }
    
    /**
     * Add a message conversation
     * @param {string} conversationId
     * @param {string} role
     * @param {string} content
     */

    async addMessage(conversationId, role, content){
        const contentStr = typeof content === "string"
        ? content
        : JSON.stringify(content)
        return await prisma.message.create({
            data:{
                conversationId,
                role,
                content:contentStr
            }
        })
    }

    /**
     * Get conversation message
     * @param {string} conversationId
     */
    
    async getMessage(conversationId){
        const message = await prisma.message.findMany({
            where: {conversationId},
            orderBy:{createdAt:"asc"},
        })
        return message.map((msg) => ({
            ...msg,
            content: this.parseContent(msg.content)
        }))
    }
    
    /**
     * Get user conversation message
     * @param {string} userId
     */
    async getUserConversation(userId){
        return await prisma.conversation.findMany({
            where:{userId},
            orderBy:{updatedAt:"desc"},
            include:{
                message:{
                    take:1,
                    orderBy:{createdAt:"desc"}
                }
            }
        })
    }
    
    /**
     * delete conversation message
     * @param {string} conversationId
     * @param {string} userId
     */

    async deleteConversation(conversationId, userId){
        return await prisma.conversation.deleteMany({
            where:{
                id:conversationId,
                userId,
            }
        })
    }

    /**
     * Update conversation title
     * @param {string} conversationId
     * @param {string} title
     */
    
    async updateTitle(conversationId, title){
        return await prisma.conversation.update({
            where: {
                id:conversationId
            },
            data:{title},
        })
    }

    
    /**
     * Helper to parse content (JSON or string)
     */

    parseContent(content){
        try {
            return JSON.parse(content)
        } catch (error) {
            return content
        }
    }

    /**
     * Format message for AI SDK
     * @param {Array} message
     */

    formatedMessageForAI(message){
        return message.map((msg) => ({
            role: msg.role,
            content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
        }))
    }

}