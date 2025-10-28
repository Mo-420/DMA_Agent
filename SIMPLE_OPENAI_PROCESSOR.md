# Simple OpenAI Processor API

## Overview

A streamlined service that takes **instructions**, **data**, and **callback URL** as input, processes them with OpenAI's chat API, and calls back with the results. Perfect for offloading OpenAI processing from WordPress.

## API Endpoint

### Base URL
- Local: `http://localhost:3005/api/openai-processor`
- Production: `http://78.46.232.79:3004/api/openai-processor`

### Process Request

**POST** `/process`

Submit data for OpenAI processing with custom instructions.

#### Request Body
```json
{
  "instructions": "You are a yacht charter expert. Generate compelling marketing descriptions.",
  "data": {
    "yacht_name": "Ocean Dream",
    "length": "50 feet",
    "capacity": "12 guests",
    "year": "2020",
    "location": "Mediterranean"
  },
  "callbackUrl": "https://yourwordpress.com/wp-json/dma/v1/openai-callback",
  "callId": "yacht_desc_123",
  "model": "gpt-4o-mini",
  "options": {
    "temperature": 0.8,
    "max_tokens": 500
  }
}
```

#### Required Fields
- `instructions` - System prompt/instructions for OpenAI
- `data` - Data to process (string, object, array, etc.)
- `callbackUrl` - URL to receive the callback with results

#### Optional Fields
- `callId` - Custom call ID (auto-generated if not provided)
- `model` - OpenAI model (default: `gpt-4o-mini`)
- `options` - Additional OpenAI options

#### Response
```json
{
  "callId": "yacht_desc_123",
  "status": "processing",
  "message": "Request submitted for OpenAI processing"
}
```

### Check Status

**GET** `/status/:callId`

Check the status of a processing request.

#### Response
```json
{
  "callId": "yacht_desc_123",
  "status": "processing",
  "createdAt": 1761653732415,
  "model": "gpt-4o-mini",
  "processingTime": 1500
}
```

### List Requests

**GET** `/list`

List all pending requests (for debugging).

#### Response
```json
{
  "total": 2,
  "requests": [
    {
      "callId": "yacht_desc_123",
      "status": "processing",
      "createdAt": 1761653732415,
      "model": "gpt-4o-mini",
      "callbackUrl": "https://yourwordpress.com/wp-json/dma/v1/openai-callback"
    }
  ]
}
```

## Callback Format

When processing completes, the service POSTs to your `callbackUrl`:

### Success Response
```json
{
  "callId": "yacht_desc_123",
  "status": "success",
  "response": "Experience the ultimate luxury aboard Ocean Dream, a stunning 50-foot yacht...",
  "usage": {
    "prompt_tokens": 45,
    "completion_tokens": 120,
    "total_tokens": 165
  },
  "finishReason": "stop",
  "processedAt": 1761653734000,
  "processingTime": 1585,
  "model": "gpt-4o-mini",
  "instructions": "You are a yacht charter expert...",
  "originalData": {
    "yacht_name": "Ocean Dream",
    "length": "50 feet",
    "capacity": "12 guests",
    "year": "2020",
    "location": "Mediterranean"
  }
}
```

### Error Response
```json
{
  "callId": "yacht_desc_123",
  "status": "error",
  "error": "Rate limit exceeded",
  "errorType": "OpenAIError",
  "processedAt": 1761653734000,
  "processingTime": 500,
  "model": "gpt-4o-mini",
  "instructions": "You are a yacht charter expert...",
  "originalData": {
    "yacht_name": "Ocean Dream",
    "length": "50 feet",
    "capacity": "12 guests",
    "year": "2020",
    "location": "Mediterranean"
  }
}
```

## WordPress Integration

### 1. Install the PHP Class

Copy `examples/wordpress-simple-integration.php` to your WordPress theme or plugin.

### 2. Create Callback Endpoint

Add this to your WordPress functions.php or plugin:

```php
add_action('rest_api_init', function() {
    register_rest_route('dma/v1', '/openai-callback', [
        'methods' => 'POST',
        'callback' => 'handle_openai_callback',
        'permission_callback' => '__return_true' // Add proper auth
    ]);
});

function handle_openai_callback($request) {
    $params = $request->get_json_params();
    
    $call_id = $params['callId'] ?? '';
    $status = $params['status'] ?? 'unknown';
    $response = $params['response'] ?? null;
    
    if ($call_id && $status === 'success') {
        // Update post meta with AI response
        $post_id = get_option('dma_pending_call_' . $call_id);
        if ($post_id) {
            update_post_meta($post_id, 'dma_ai_response', $response);
            update_post_meta($post_id, 'dma_ai_usage', $params['usage'] ?? null);
            delete_option('dma_pending_call_' . $call_id);
        }
    }
    
    return ['success' => true, 'callId' => $call_id];
}
```

### 3. Usage Examples

#### Generate Yacht Description
```php
function generate_yacht_description($yacht_id) {
    $processor = new Simple_OpenAI_Processor();
    
    $instructions = 'You are a yacht charter expert. Generate compelling marketing descriptions for yacht listings.';
    
    $data = [
        'yacht_name' => get_the_title($yacht_id),
        'length' => get_post_meta($yacht_id, 'yacht_length', true),
        'capacity' => get_post_meta($yacht_id, 'yacht_capacity', true),
        'year' => get_post_meta($yacht_id, 'yacht_year', true)
    ];
    
    $result = $processor->process(
        $instructions,
        $data,
        'https://yourwordpress.com/wp-json/dma/v1/openai-callback',
        'yacht_desc_' . $yacht_id
    );
    
    if ($result['success']) {
        update_option('dma_pending_call_yacht_desc_' . $yacht_id, $yacht_id);
        return ['success' => true, 'callId' => $result['callId']];
    }
    
    return ['success' => false, 'error' => $result['error']];
}
```

#### Process Customer Inquiry
```php
function process_customer_inquiry($inquiry_data) {
    $processor = new Simple_OpenAI_Processor();
    
    $instructions = 'You are a yacht charter customer service expert. Analyze customer inquiries and provide helpful responses.';
    
    $result = $processor->process(
        $instructions,
        $inquiry_data,
        'https://yourwordpress.com/wp-json/dma/v1/openai-callback',
        'inquiry_' . time()
    );
    
    return $result;
}
```

#### Generate SEO Content
```php
function generate_seo_content($content_data) {
    $processor = new Simple_OpenAI_Processor();
    
    $instructions = 'You are an SEO content expert. Generate optimized content for yacht charter websites.';
    
    $result = $processor->process(
        $instructions,
        $content_data,
        'https://yourwordpress.com/wp-json/dma/v1/openai-callback',
        'seo_' . time()
    );
    
    return $result;
}
```

## Testing

### Local Testing
```bash
node examples/test-simple-processor.js
```

### Manual Testing with cURL

#### Submit Request
```bash
curl -X POST http://localhost:3005/api/openai-processor/process \
  -H "Content-Type: application/json" \
  -d '{
    "instructions": "You are a yacht charter expert.",
    "data": {"yacht_name": "Ocean Dream", "length": "50 feet"},
    "callbackUrl": "https://httpbin.org/post",
    "callId": "test_123"
  }'
```

#### Check Status
```bash
curl http://localhost:3005/api/openai-processor/status/test_123
```

## Use Cases

1. **Yacht Description Generation** - Auto-generate marketing descriptions
2. **Customer Inquiry Processing** - Analyze and respond to customer questions
3. **SEO Content Creation** - Generate optimized content for yacht listings
4. **Email Response Generation** - Create personalized email responses
5. **Content Translation** - Translate yacht descriptions to multiple languages
6. **Data Analysis** - Analyze yacht performance data and generate insights

## Benefits

- **Simple Interface** - Just instructions, data, and callback URL
- **No Timeouts** - WordPress doesn't wait for OpenAI responses
- **Flexible Data** - Accept any data format (string, object, array)
- **Custom Instructions** - Tailor AI behavior for each use case
- **Error Handling** - Comprehensive error handling with callbacks
- **Status Tracking** - Monitor request progress
- **Scalable** - Handle multiple concurrent requests

## Configuration

### Environment Variables
- `OPENAI_API_KEY` - Your OpenAI API key
- `PORT` - Server port (default: 3004)

### Supported Models
- `gpt-4o-mini` (default, cost-effective)
- `gpt-4o` (most capable)
- `gpt-3.5-turbo` (fast and cheap)
- Any other OpenAI chat model

## Error Handling

The service handles:
- OpenAI API errors (rate limits, invalid requests, etc.)
- Network timeouts
- Invalid request formats
- Callback failures

All errors are sent back to WordPress via the callback URL with detailed error information.
