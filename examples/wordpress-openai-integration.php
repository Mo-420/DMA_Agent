<?php
/**
 * WordPress OpenAI Callback Integration
 * 
 * This shows how to integrate WordPress with the OpenAI callback service
 * to offload OpenAI processing to the Node.js server
 */

class DMA_OpenAI_Callback_Service {
    
    private $callback_base_url = 'http://78.46.232.79:3004/api/openai-callback';
    
    /**
     * Send OpenAI chat request via callback service
     * 
     * @param string $callback_url WordPress endpoint to receive results
     * @param array $messages OpenAI messages array
     * @param string $model OpenAI model (default: gpt-4o-mini)
     * @param array $options Additional OpenAI options
     * @param string $request_id Optional custom request ID
     * @return array Response with request ID
     */
    public function send_chat_request($callback_url, $messages, $model = 'gpt-4o-mini', $options = [], $request_id = null) {
        
        $payload = [
            'callbackUrl' => $callback_url,
            'messages' => $messages,
            'model' => $model,
            'options' => $options
        ];
        
        if ($request_id) {
            $payload['requestId'] = $request_id;
        }
        
        $response = wp_remote_post($this->callback_base_url . '/chat', [
            'headers' => [
                'Content-Type' => 'application/json',
            ],
            'body' => json_encode($payload),
            'timeout' => 10
        ]);
        
        if (is_wp_error($response)) {
            return [
                'success' => false,
                'error' => $response->get_error_message()
            ];
        }
        
        $body = wp_remote_retrieve_body($response);
        $result = json_decode($body, true);
        
        return [
            'success' => true,
            'requestId' => $result['requestId'],
            'status' => $result['status']
        ];
    }
    
    /**
     * Send batch OpenAI requests
     * 
     * @param string $callback_url WordPress endpoint to receive results
     * @param array $requests Array of request objects
     * @return array Response with batch ID
     */
    public function send_batch_request($callback_url, $requests) {
        
        $payload = [
            'callbackUrl' => $callback_url,
            'requests' => $requests
        ];
        
        $response = wp_remote_post($this->callback_base_url . '/batch', [
            'headers' => [
                'Content-Type' => 'application/json',
            ],
            'body' => json_encode($payload),
            'timeout' => 15
        ]);
        
        if (is_wp_error($response)) {
            return [
                'success' => false,
                'error' => $response->get_error_message()
            ];
        }
        
        $body = wp_remote_retrieve_body($response);
        $result = json_decode($body, true);
        
        return [
            'success' => true,
            'batchId' => $result['batchId'],
            'requestIds' => $result['requestIds']
        ];
    }
    
    /**
     * Check request status
     */
    public function check_status($request_id) {
        
        $response = wp_remote_get($this->callback_base_url . '/status/' . $request_id);
        
        if (is_wp_error($response)) {
            return false;
        }
        
        $body = wp_remote_retrieve_body($response);
        return json_decode($body, true);
    }
}

/**
 * WordPress REST API endpoint to receive OpenAI callback results
 */
add_action('rest_api_init', function() {
    
    register_rest_route('dma/v1', '/openai-callback', [
        'methods' => 'POST',
        'callback' => 'dma_handle_openai_callback',
        'permission_callback' => '__return_true' // Add proper auth
    ]);
});

function dma_handle_openai_callback($request) {
    
    $params = $request->get_json_params();
    
    // Log the callback result
    error_log('DMA OpenAI Callback: ' . print_r($params, true));
    
    $request_id = $params['requestId'] ?? '';
    $status = $params['status'] ?? 'unknown';
    $result = $params['result'] ?? null;
    
    // Process the result based on requestId
    if ($request_id && $result) {
        
        // Example: Update post meta with AI response
        $post_id = get_option('dma_pending_request_' . $request_id);
        if ($post_id) {
            update_post_meta($post_id, 'dma_ai_response', $result['response']);
            update_post_meta($post_id, 'dma_ai_usage', $result['usage']);
            update_post_meta($post_id, 'dma_ai_processed_at', $result['processedAt']);
            
            // Clean up pending request
            delete_option('dma_pending_request_' . $request_id);
        }
        
        // Example: Send email notification
        if ($status === 'success') {
            $admin_email = get_option('admin_email');
            wp_mail($admin_email, 'OpenAI Request Completed', 
                'Request ID: ' . $request_id . "\n" .
                'Response: ' . substr($result['response'], 0, 200) . '...'
            );
        }
    }
    
    return [
        'success' => true,
        'message' => 'OpenAI callback received',
        'requestId' => $request_id
    ];
}

/**
 * Example usage: Generate yacht description
 */
function generate_yacht_description($yacht_id) {
    
    $callback_service = new DMA_OpenAI_Callback_Service();
    
    // Get yacht data
    $yacht_data = get_post($yacht_id);
    $yacht_meta = get_post_meta($yacht_id);
    
    // Prepare messages for OpenAI
    $messages = [
        [
            'role' => 'system',
            'content' => 'You are a yacht charter expert. Generate compelling descriptions for yacht listings.'
        ],
        [
            'role' => 'user',
            'content' => sprintf(
                'Generate a marketing description for this yacht: %s. Length: %s, Capacity: %s, Year: %s',
                $yacht_data->post_title,
                $yacht_meta['yacht_length'][0] ?? 'Unknown',
                $yacht_meta['yacht_capacity'][0] ?? 'Unknown',
                $yacht_meta['yacht_year'][0] ?? 'Unknown'
            )
        ]
    ];
    
    // Send request
    $result = $callback_service->send_chat_request(
        'https://yourwordpress.com/wp-json/dma/v1/openai-callback',
        $messages,
        'gpt-4o-mini',
        [
            'temperature' => 0.8,
            'max_tokens' => 500
        ],
        'yacht_desc_' . $yacht_id
    );
    
    if ($result['success']) {
        // Store pending request for callback
        update_option('dma_pending_request_yacht_desc_' . $yacht_id, $yacht_id);
        
        return [
            'success' => true,
            'requestId' => $result['requestId'],
            'message' => 'Yacht description generation started'
        ];
    } else {
        return [
            'success' => false,
            'error' => $result['error']
        ];
    }
}

/**
 * Example usage: Batch process multiple yacht descriptions
 */
function batch_generate_yacht_descriptions($yacht_ids) {
    
    $callback_service = new DMA_OpenAI_Callback_Service();
    $requests = [];
    
    foreach ($yacht_ids as $yacht_id) {
        $yacht_data = get_post($yacht_id);
        $yacht_meta = get_post_meta($yacht_id);
        
        $requests[] = [
            'requestId' => 'yacht_desc_' . $yacht_id,
            'messages' => [
                [
                    'role' => 'system',
                    'content' => 'You are a yacht charter expert. Generate compelling descriptions for yacht listings.'
                ],
                [
                    'role' => 'user',
                    'content' => sprintf(
                        'Generate a marketing description for this yacht: %s. Length: %s, Capacity: %s, Year: %s',
                        $yacht_data->post_title,
                        $yacht_meta['yacht_length'][0] ?? 'Unknown',
                        $yacht_meta['yacht_capacity'][0] ?? 'Unknown',
                        $yacht_meta['yacht_year'][0] ?? 'Unknown'
                    )
                ]
            ],
            'model' => 'gpt-4o-mini',
            'options' => [
                'temperature' => 0.8,
                'max_tokens' => 500
            ]
        ];
    }
    
    $result = $callback_service->send_batch_request(
        'https://yourwordpress.com/wp-json/dma/v1/openai-callback',
        $requests
    );
    
    return $result;
}

/**
 * AJAX handler for checking OpenAI request status
 */
add_action('wp_ajax_check_openai_status', 'ajax_check_openai_status');
add_action('wp_ajax_nopriv_check_openai_status', 'ajax_check_openai_status');

function ajax_check_openai_status() {
    
    $request_id = sanitize_text_field($_POST['request_id']);
    $callback_service = new DMA_OpenAI_Callback_Service();
    
    $status = $callback_service->check_status($request_id);
    
    wp_send_json($status);
}
