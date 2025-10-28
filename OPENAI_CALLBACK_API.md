# OpenAI Callback API Documentation

## Overview

The OpenAI Callback API allows WordPress to offload OpenAI processing to the Node.js server. Instead of making direct OpenAI API calls from WordPress (which can timeout), WordPress sends requests to the Node.js server, which processes them asynchronously and calls back to WordPress with the results.

## API Endpoints

### Base URL
- Local: `http://localhost:3005/api/openai-callback`
- Production: `http://78.46.232.79:3004/api/openai-callback`

### 1. Single Chat Request

**POST** `/chat`

Submit a single OpenAI chat completion request.

#### Request Body
```json
{
  "callbackUrl": "https://yourwordpress.com/wp-json/dma/v1/openai-callback",
  "messages": [
    {
      "role": "system",
      "content": "You are a yacht charter expert."
    },
    {
      "role": "user", 
      "content": "What are the key features of luxury yacht charters?"
    }
  ],
  "model": "gpt-4o-mini",
  "options": {
    "temperature": 0.7,
    "max_tokens": 500
  },
  "requestId": "yacht_desc_123"
}
```

#### Response
```json
{
  "requestId": "yacht_desc_123",
  "status": "processing",
  "message": "OpenAI request submitted for processing"
}
```

### 2. Batch Requests

**POST** `/batch`

Submit multiple OpenAI requests in a single batch.

#### Request Body
```json
{
  "callbackUrl": "https://yourwordpress.com/wp-json/dma/v1/openai-callback",
  "requests": [
    {
      "requestId": "batch_1",
      "messages": [
        { "role": "user", "content": "What is yacht chartering?" }
      ],
      "model": "gpt-4o-mini",
      "options": { "max_tokens": 100 }
    },
    {
      "requestId": "batch_2", 
      "messages": [
        { "role": "user", "content": "What are yacht charter costs?" }
      ],
      "model": "gpt-4o-mini",
      "options": { "max_tokens": 100 }
    }
  ]
}
```

#### Response
```json
{
  "batchId": "batch_1761653433390_xpnp5e622",
  "requestIds": ["batch_1", "batch_2"],
  "status": "processing",
  "message": "Batch of 2 requests submitted for processing"
}
```

### 3. Check Request Status

**GET** `/status/:requestId`

Check the status of a specific request.

#### Response
```json
{
  "requestId": "yacht_desc_123",
  "status": "processing",
  "createdAt": 1761653428378,
  "model": "gpt-4o-mini",
  "processingTime": 5009
}
```

### 4. List All Requests

**GET** `/list`

List all pending requests (for debugging).

#### Response
```json
{
  "total": 3,
  "requests": [
    {
      "requestId": "yacht_desc_123",
      "status": "processing",
      "createdAt": 1761653428378,
      "model": "gpt-4o-mini",
      "callbackUrl": "https://yourwordpress.com/wp-json/dma/v1/openai-callback"
    }
  ]
}
```

## Callback Format

When processing completes, the Node.js server will POST to your `callbackUrl` with:

### Success Response
```json
{
  "requestId": "yacht_desc_123",
  "status": "success",
  "result": {
    "requestId": "yacht_desc_123",
    "model": "gpt-4o-mini",
    "response": "Luxury yacht charters offer unparalleled experiences...",
    "usage": {
      "prompt_tokens": 25,
      "completion_tokens": 150,
      "total_tokens": 175
    },
    "finishReason": "stop",
    "processedAt": 1761653430000,
    "processingTime": 1622
  },
  "timestamp": "2024-12-28T10:30:30.000Z"
}
```

### Error Response
```json
{
  "requestId": "yacht_desc_123",
  "status": "error",
  "result": {
    "requestId": "yacht_desc_123",
    "error": "Rate limit exceeded",
    "errorType": "OpenAIError",
    "processedAt": 1761653430000,
    "processingTime": 500
  },
  "timestamp": "2024-12-28T10:30:30.000Z"
}
```

## WordPress Integration

### 1. Install the PHP Class

Copy `examples/wordpress-openai-integration.php` to your WordPress theme or plugin.

### 2. Create Callback Endpoint

Add this to your WordPress functions.php or plugin:

```php
add_action('rest_api_init', function() {
    register_rest_route('dma/v1', '/openai-callback', [
        'methods' => 'POST',
        'callback' => 'dma_handle_openai_callback',
        'permission_callback' => '__return_true' // Add proper auth
    ]);
});

function dma_handle_openai_callback($request) {
    $params = $request->get_json_params();
    
    $request_id = $params['requestId'] ?? '';
    $status = $params['status'] ?? 'unknown';
    $result = $params['result'] ?? null;
    
    if ($request_id && $result) {
        // Update post meta with AI response
        $post_id = get_option('dma_pending_request_' . $request_id);
        if ($post_id) {
            update_post_meta($post_id, 'dma_ai_response', $result['response']);
            update_post_meta($post_id, 'dma_ai_usage', $result['usage']);
            delete_option('dma_pending_request_' . $request_id);
        }
    }
    
    return ['success' => true, 'requestId' => $request_id];
}
```

### 3. Usage Examples

#### Generate Yacht Description
```php
function generate_yacht_description($yacht_id) {
    $callback_service = new DMA_OpenAI_Callback_Service();
    
    $messages = [
        [
            'role' => 'system',
            'content' => 'You are a yacht charter expert. Generate compelling descriptions.'
        ],
        [
            'role' => 'user',
            'content' => "Generate a marketing description for yacht ID: $yacht_id"
        ]
    ];
    
    $result = $callback_service->send_chat_request(
        'https://yourwordpress.com/wp-json/dma/v1/openai-callback',
        $messages,
        'gpt-4o-mini',
        ['temperature' => 0.8, 'max_tokens' => 500],
        'yacht_desc_' . $yacht_id
    );
    
    if ($result['success']) {
        update_option('dma_pending_request_yacht_desc_' . $yacht_id, $yacht_id);
        return ['success' => true, 'requestId' => $result['requestId']];
    }
    
    return ['success' => false, 'error' => $result['error']];
}
```

#### Batch Process Multiple Yachts
```php
function batch_generate_yacht_descriptions($yacht_ids) {
    $callback_service = new DMA_OpenAI_Callback_Service();
    $requests = [];
    
    foreach ($yacht_ids as $yacht_id) {
        $requests[] = [
            'requestId' => 'yacht_desc_' . $yacht_id,
            'messages' => [
                ['role' => 'user', 'content' => "Generate description for yacht $yacht_id"]
            ],
            'model' => 'gpt-4o-mini',
            'options' => ['max_tokens' => 500]
        ];
    }
    
    return $callback_service->send_batch_request(
        'https://yourwordpress.com/wp-json/dma/v1/openai-callback',
        $requests
    );
}
```

## Testing

### Local Testing
```bash
node examples/test-openai-callback.js
```

### Manual Testing with cURL

#### Submit Request
```bash
curl -X POST http://localhost:3005/api/openai-callback/chat \
  -H "Content-Type: application/json" \
  -d '{
    "callbackUrl": "https://httpbin.org/post",
    "messages": [
      {"role": "user", "content": "What is yacht chartering?"}
    ],
    "model": "gpt-4o-mini"
  }'
```

#### Check Status
```bash
curl http://localhost:3005/api/openai-callback/status/test_yacht_marketing
```

## Benefits

1. **No Timeouts**: WordPress doesn't wait for OpenAI responses
2. **Better Performance**: Async processing doesn't block WordPress
3. **Batch Processing**: Handle multiple requests efficiently
4. **Error Handling**: Centralized error handling and retry logic
5. **Usage Tracking**: Monitor OpenAI API usage and costs
6. **Scalability**: Node.js server can handle high volume

## Configuration

### Environment Variables
- `OPENAI_API_KEY`: Your OpenAI API key
- `PORT`: Server port (default: 3004)

### Models Supported
- `gpt-4o-mini` (default)
- `gpt-4o`
- `gpt-3.5-turbo`
- Any other OpenAI chat model

## Error Handling

The service handles:
- OpenAI API errors
- Network timeouts
- Invalid requests
- Callback failures

All errors are sent back to WordPress via the callback URL.
