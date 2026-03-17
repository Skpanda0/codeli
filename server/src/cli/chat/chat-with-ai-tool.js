import chalk from "chalk";
import boxen from "boxen";
import { text, isCancel, cancel, intro, outro, multiselect, select } from "@clack/prompts";
import yoctoSpinner from "yocto-spinner";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import { AIService } from "../ai/google-service.js";
import {ChatService} from "../../service/chat.service.js"
import { getStoredToken } from '../../lib/token.js'
import prisma from "../../lib/db.js";
import { 
  availableTools, 
  getEnabledTools, 
  enableTools, 
  getEnabledToolNames,
  resetTools 
} from "../../config/tool.config.js";

// Configure marked for terminal
marked.use(
  markedTerminal({
    code: chalk.cyan,
    blockquote: chalk.gray.italic,
    heading: chalk.green.bold,
    firstHeading: chalk.magenta.underline.bold,
    hr: chalk.reset,
    listitem: chalk.reset,
    list: chalk.reset,
    paragraph: chalk.reset,
    strong: chalk.bold,
    em: chalk.italic,
    codespan: chalk.yellow.bgBlack,
    del: chalk.dim.gray.strikethrough,
    link: chalk.blue.underline,
    href: chalk.blue.underline,
  })
);

// Initialize services
const aiService = new AIService();
const chatService = new ChatService();

async function getUserFromToken() {
  const token = await getStoredToken();
  
  if (!token?.access_token) {
    throw new Error("Not authenticated. Please run 'orbit login' first.");
  }

  const spinner = yoctoSpinner({ text: "Authenticating..." }).start();

  const user = await prisma.user.findFirst({
    where: {
      sessions: {
        some: { token: token.access_token },
      },
    },
  });

  if (!user) {
    spinner.error("User not found");
    throw new Error("User not found. Please login again.");
  }

  spinner.success(`Welcome back, ${user.name}!`);
  return user;
}

async function selectTools() {
  const toolOptions = availableTools.map(tool => ({
    value:tool.id,
    label:tool.name,
    hint:tool.description
  }))
  const selectedTools = await multiselect({
    message:chalk.cyan("select tools to enable (Space to select, enter to confrim):"),
    options: toolOptions,
    required: false,
  })
  if(isCancel(selectedTools)){
    cancel(chalk.yellow("Tool selection cancelled"))
    process.exit(0)
  }
  enableTools(selectedTools)
  if(selectedTools.length === 0){
    console.log(chalk.yellow("\n⚠️ No tools selected. AI will work without tools.\n"))
  }else{
    const toolsBox = boxen(
      chalk.green(`✅ Enabled tools: \n${selectedTools.map(id => {
        const tool = availableTools.find(t=>t.id === id)
        return ` .${tool.name}`
      }).join('\n')}`),{
        padding:1,
        margin:{top:1,bottom:1},
        borderColor:"green",
        borderStyle:"round",
        title:"🛠️ Active Tools",
        titleAlignment:"center"
      }
    )
    console.log(toolsBox)
  }
  return selectTools.length > 0
}

async function initConversation(userId, conversationId = null, mode = "tool") {
  const spinner = yoctoSpinner({
    text:"Loading conversation..."
  }).start()
  const conversation = await chatService.getOrCreateConversation(userId,conversationId,mode)
  spinner.success("COnversation loaded")
  const enabledToolsNames = getEnabledToolNames()
  const toolDisplay = enabledToolsNames.length > 0 
    ? `\n${chalk.gray("Active Tools")} ${enabledToolsNames.join(", ")}`
    :`\n${chalk.gray("No tools endabled")}`
  const conversationInfo = boxen(`${chalk.bold("OCnversation")}: ${conversation.title}\n${chalk.gray("ID: "+conversation.id)}\n${chalk.gray('Mode: +'+conversation.mode)}${toolDisplay}`,
    {
      padding:1,
      margin:{top:1,bottom:1},
      borderStyle:"round",
      borderColor:"cyan",
      title:"💬 Tool Calling Session",
      titleAlignment:"center",
    }
  )
  console.log(conversationInfo)
  //display existing message if any
  if(conversation.message?.length > 0){
    console.log(chalk.yellow("📃 Previous message:\n"))
    displayMessages(conversation.message)
  }
  return conversation
}

function displayMessages(messages) {
  messages.forEach((msg) => {
    if (msg.role === "user") {
      const userBox = boxen(chalk.white(msg.content), {
        padding: 1,
        margin: { left: 2, bottom: 1 },
        borderStyle: "round",
        borderColor: "blue",
        title: "👤 You",
        titleAlignment: "left",
      });
      console.log(userBox);
    } else if (msg.role === "assistant") {
      const renderedContent = marked.parse(msg.content);
      const assistantBox = boxen(renderedContent.trim(), {
        padding: 1,
        margin: { left: 2, bottom: 1 },
        borderStyle: "round",
        borderColor: "green",
        title: "🤖 Assistant (with tools)",
        titleAlignment: "left",
      });
      console.log(assistantBox);
    }
  });
}

async function saveMessage(conversationId, role, content) {
  return await chatService.addMessage(conversationId, role, content);
}

async function getAIResponse(conversationId) {
  const spinner = yoctoSpinner({
    text:"AI is thinking...",
    color:"cyan"
  }).start()

  const dbMessages = await chatService.getMessage(conversationId)
  const aiMessages = chatService.formatedMessageForAI(dbMessages)
  const tools = getEnabledTools()
  let fullResponse = ""
  let isFirstChunk = true
  const toolCallsDectected = []

  try{
    const result = await aiService.sendMessage(
      aiMessages,
      (chunk)=>{
        if(isFirstChunk){
          spinner.stop()
          console.log("\n")
          const header = chalk.green.bold("🤖 Assistant")
          console.log(header)
          console.log(chalk.grey("-".repeat(60)))
          isFirstChunk = false 
        }
        fullResponse += chunk
      },
      tools,
      (toolCall) => {
        toolCallsDectected.push(toolCall)
      }
    )
    if(toolCallsDectected.length > 0){
      console.log("\n")
      const toolCallBox = boxen(
        toolCallsDectected.map(tc =>
          `${chalk.cyan("🔨 Tools:")} ${tc.toolNme}\n${chalk.gray("Args:")} ${JSON.stringify(tc.args, null, 2)}`
        ).join("\n\n"),{
          padding:1,
          margin:1,
          borderStyle:"round",
          borderColor:"cyan",
          title:"🛠️ Tool Calls",
        }
      )
      console.log(toolCallBox)
    }
    //display tools results if any
    if (result.toolResults && result.toolResults.length > 0) {
      const toolResultBox = boxen(
        toolCallsDectected.map(tr =>
          `${chalk.cyan("✅ Tools:")} ${tr.toolNme}\n${chalk.gray("Result:")} ${JSON.stringify(tr.result, null, 2).slice(0, 200)}`
        ).join("\n\n"), {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: "green",
          title: "📊 Tool Results",
        }
      )
      console.log(toolResultBox)
    }

    //render markdown response
    console.log("\n")
    const renderMarkdown = marked.parse(fullResponse)
    console.log(renderMarkdown)
    console.log(chalk.gray("-".repeat(60)))
    console.log("\n")
    
    return result.content

  }catch(error){
    spinner.error("Failed to get AI response")
    throw error
  }
}

async function updateConversationTitle(conversationId, userInput, messageCount) {
  if (messageCount === 1) {
    const title = userInput.slice(0, 50) + (userInput.length > 50 ? "..." : "");
    await chatService.updateTitle(conversationId, title);
  }
}

async function chatLoop(conversation) {
  const enabledToolNames = getEnabledToolNames()
  const helpBox = boxen(
    `${chalk.gray('• Type your message and press Enter')}\n${chalk.gray('• AI has access to:')} ${enabledToolNames.length > 0 ? enabledToolNames.join(", ") : "No tools"}\n${chalk.gray('• Type "exit" to end conversation')}\n${chalk.gray('• Press Ctrl+C to quit anytime')}`,
    {
      padding: 1,
      margin: { bottom: 1 },
      borderStyle: "round",
      borderColor: "gray",
      dimBorder: true,
    }
  );
  
  console.log(helpBox);
  while(true){
    const userInput = await text({
      message: chalk.blue("💬 Your message"),
      placeholder:"Type ypur message",
      validate(value){
        if(!value || value.trim().length === 0){
          return "Message cannot be empty"
        }
      }
    })
    if(isCancel(userInput)){
      const exitBox = boxen(chalk.yellow("Chat session is ended. GoodBye! 👋"),{
        padding:1,
        margin:1,
        borderStyle:"round",
        borderColor:"yellow",
      })
      console.log(exitBox)
      process.exit(0)
    }
    if(userInput.toLowerCase() === "exit"){
      const exitBox = boxen(chalk.yellow("Chat session is ended. GoodBye! 👋"),{
        padding:1,
        margin:1,
        borderStyle:"round",
        borderColor:"yellow",
      })
      console.log(exitBox)
      break;
    }
    const userBox = boxen(chalk.white(userInput),{
      padding:1,
      margin:{left:2,top:1,bottom:1},
      borderColor:"blue",
      borderStyle:"round",
      title:"👤 You",
      titleAlignment:"left",
    })
    console.log(userBox)

   
    // Save user message
    await saveMessage(conversation.id, "user", userInput);

    // Get messages count before AI response
    const messages = await chatService.getMessage(conversation.id);
    
    // Get AI response with streaming and markdown rendering
    const aiResponse = await getAIResponse(conversation.id);

    // Save AI response
    await saveMessage(conversation.id, "assistant", aiResponse);

    // Update title if first exchange
    await updateConversationTitle(conversation.id, userInput, messages.length);
  }
}



export async function startToolChat(conversationId = null) {
  try {
    intro(
      boxen(chalk.bold.cyan("🛠️ Codeli Ai - Tool Caling Mode"),{
        padding:1,
        borderColor:"cyan",
        borderStyle:"double"
      })
    )
    const user = await getUserFromToken()
    await selectTools()
    const conversation = await initConversation(user.id, conversationId, "tool")
    await chatLoop(conversation)
    resetTools()
    outro(chalk.green("✨Thanks for using tools"))
  } catch (error) {
    const errorBox = boxen(chalk.red(`❌ Error: ${error.message}`),{
      padding:1,
      margin:1,
      borderStyle:"round",
      borderColor:"red",
    })
    console.log(errorBox)
    resetTools()
    process.exit(1)
  }
}
