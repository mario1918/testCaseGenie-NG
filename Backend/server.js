import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { generateTestCases } from "./geminiClient.js";

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post("/generate", async (req, res) => {
  try {
    const { 
      prompt, 
      existing_test_cases = [], 
      is_additional_generation = false, 
      summary = '', 
      issue_key = '',
      conversation_history = [],
      special_comments = ''
    } = req.body;
    
    // Enhance the prompt with special comments if provided
    let enhancedPrompt = prompt;
    if (special_comments && special_comments.trim()) {
      enhancedPrompt = `${prompt}\n\nAdditional Instructions:\n${special_comments}`;
    }
    
    const output = await generateTestCases({
      prompt: enhancedPrompt,
      existing_test_cases,
      is_additional_generation,
      summary,
      issue_key,
      conversation_history
    });

    let parsed;
    try {
      parsed = JSON.parse(output);
      // Ensure we're always working with an array
      if (!Array.isArray(parsed)) {
        parsed = [parsed];
      }
    } catch (error) {
      console.error('Error parsing model output:', output);
      return res.status(500).json({ 
        error: "Model did not return valid JSON", 
        raw: output 
      });
    }

    // Generate incremental IDs for test cases
    // Find the highest existing ID from existing test cases
    let maxExistingId = 0;
    if (existing_test_cases && Array.isArray(existing_test_cases)) {
      existing_test_cases.forEach(tc => {
        const numericId = parseInt(tc.id);
        if (!isNaN(numericId) && numericId > maxExistingId) {
          maxExistingId = numericId;
        }
      });
    }
    let idCounter = maxExistingId + 1;
    
    // Normalize keys and clean up test cases
    const cleanedCases = parsed.map((tc, index) => {
      // Handle steps whether they come as array or string
      let steps = '';
      if (Array.isArray(tc.steps)) {
        // Convert array of steps to numbered string
        steps = tc.steps
          .map((step, index) => `${index + 1}. ${step}`)
          .join('\n');
      } else {
        // Handle string steps - check if they're already numbered and split them
        steps = tc.steps || '';
        if (steps && typeof steps === 'string') {
          console.log('🔍 Original steps string:', steps);
          
          // More aggressive step formatting
          let originalSteps = steps;
          
          // Check if we have numbered steps (1., 2., 3., etc.)
          const numberedStepMatches = steps.match(/\d+\.\s+/g);
          if (numberedStepMatches && numberedStepMatches.length > 1) {
            console.log('✅ Found multiple numbered steps, splitting...');
            
            // Method 1: Split using regex and clean up
            let splitSteps = steps.split(/(?=\d+\.\s+)/)
              .filter(step => step.trim())
              .map(step => step.trim());
            
            if (splitSteps.length > 1) {
              steps = splitSteps.join('\n');
              console.log('🔄 Method 1 - Split result:', steps);
            } else {
              // Method 2: More aggressive replacement
              steps = steps
                .replace(/(\d+\.\s+)/g, '\n$1') // Add newline before each number
                .replace(/^\n/, '') // Remove leading newline
                .trim();
              console.log('🔄 Method 2 - Replace result:', steps);
            }
          } else {
            console.log('❌ No multiple numbered steps found');
          }
          
          // Log final result
          if (steps !== originalSteps) {
            console.log('🔄 Final formatted steps:', steps);
          } else {
            console.log('❌ No formatting applied, keeping original');
          }
        }
      }

      // Generate incremental ID
      const testCaseId = idCounter++;
      
      // If it's already in the correct format, return as is
      if (tc.testCase || tc.description) {
        return {
          id: testCaseId.toString(),
          title: tc.testCase || '',
          description: tc.description || '',
          preconditions: tc.preconditions || '',
          steps: steps,
          expectedResult: tc.expectedResult || '',
          priority: tc.priority || 'Medium'
        };
      }
      
      // Legacy format support
      return {
        id: testCaseId.toString(),
        title: tc.title || tc.testCase || '',
        description: tc.description || '',
        preconditions: tc.preconditions || tc.Preconditions || '',
        steps: steps,
        expectedResult: tc.expectedResult || tc.ExpectedResult || '',
        priority: (tc.priority || tc.Priority || 'Medium').toString()
      };
    });

    // Add conversation history to the response
    const response = {
      testCases: cleanedCases,
      conversation_history: [
        ...(conversation_history || []),
        {
          role: 'assistant',
          content: JSON.stringify(cleanedCases)
        }
      ]
    };
    console.log('🤖 ENHANCED PROMPT SENT TO AI:');
    console.log('='.repeat(80));
    console.log(enhancedPrompt);
    if (special_comments && special_comments.trim()) {
      console.log('💬 Special Comments Added:', special_comments);
    }
    console.log('='.repeat(80));
    
    // Log steps transformation for debugging
    cleanedCases.forEach((tc, index) => {
      if (tc.steps && tc.steps.includes('\n')) {
        console.log(`📝 Test Case ${index + 1} Steps (formatted):`);
        console.log(tc.steps);
        console.log('─'.repeat(40));
      }
    });
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
