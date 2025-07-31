// Test the middleware with the hosted TGI endpoint
const { streamNaturalText } = require('./packages/ai/src/middleware/streamNaturalText');

async function testMiddleware() {
  console.log('Testing middleware with hosted TGI endpoint...');
  
  const mockRes = {
    chunks: [],
    write(chunk) {
      this.chunks.push(chunk);
    },
    end() {
      console.log('Stream ended');
    }
  };

  const mockNext = () => {};

  const req = {
    body: {
      messages: [
        {
          role: 'user',
          content: 'What is machine learning?'
        }
      ]
    }
  };

  try {
    await streamNaturalText(req, mockRes, mockNext);
    
    console.log('✅ Middleware test completed');
    console.log(`Received ${mockRes.chunks.length} chunks`);
    
    // Show first few chunks
    const sampleChunks = mockRes.chunks.slice(0, 5);
    console.log('Sample chunks:', sampleChunks.map(c => c.toString()));
    
  } catch (error) {
    console.error('❌ Middleware test failed:', error);
  }
}

testMiddleware();