<?php
/**
 * Simple WordPress Integration for OpenAI Processor
 * 
 * This shows how to use the streamlined OpenAI processor service
 */

class Simple_OpenAI_Processor {
    
    private $processor_url = 'http://78.46.232.79:3004/api/openai-processor';
    
    /**
     * Process data with OpenAI and get callback
     * 
     * @param string $instructions System prompt/instructions
     * @param mixed $data Data to process
     * @param string $callback_url WordPress callback URL
     * @param string $call_id Optional custom call ID
     * @param string $model OpenAI model (default: gpt-4o-mini)
     * @param array $options Additional OpenAI options
     * @return array Response with call ID
     */
    public function process($instructions, $data, $callback_url, $call_id = null, $model = 'gpt-4o-mini', $options = []) {
        
        $payload = [
            'instructions' => $instructions,
            'data' => $data,
            'callbackUrl' => $callback_url,
            'model' => $model,
            'options' => $options
        ];
        
        if ($call_id) {
            $payload['callId'] = $call_id;
        }
        
        $response = wp_remote_post($this->processor_url . '/process', [
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
            'callId' => $result['callId'],
            'status' => $result['status']
        ];
    }
    
    /**
     * Check request status
     */
    public function check_status($call_id) {
        
        $response = wp_remote_get($this->processor_url . '/status/' . $call_id);
        
        if (is_wp_error($response)) {
            return false;
        }
        
        $body = wp_remote_retrieve_body($response);
        return json_decode($body, true);
    }
}

/**
 * WordPress REST API endpoint to receive OpenAI processor callbacks
 */
add_action('rest_api_init', function() {
    
    register_rest_route('dma/v1', '/openai-callback', [
        'methods' => 'POST',
        'callback' => 'handle_openai_callback',
        'permission_callback' => '__return_true' // Add proper auth
    ]);
});

function handle_openai_callback($request) {
    
    $params = $request->get_json_params();
    
    // Log the callback
    error_log('OpenAI Processor Callback: ' . print_r($params, true));
    
    $call_id = $params['callId'] ?? '';
    $status = $params['status'] ?? 'unknown';
    $response = $params['response'] ?? null;
    $error = $params['error'] ?? null;
    
    // Process the result based on callId
    if ($call_id) {
        
        // Example: Update post meta with AI response
        $post_id = get_option('dma_pending_call_' . $call_id);
        if ($post_id && $status === 'success') {
            update_post_meta($post_id, 'dma_ai_response', $response);
            update_post_meta($post_id, 'dma_ai_usage', $params['usage'] ?? null);
            update_post_meta($post_id, 'dma_ai_processed_at', $params['processedAt'] ?? null);
            
            // Clean up pending call
            delete_option('dma_pending_call_' . $call_id);
        }
        
        // Example: Send email notification
        if ($status === 'success') {
            $admin_email = get_option('admin_email');
            wp_mail($admin_email, 'OpenAI Processing Completed', 
                'Call ID: ' . $call_id . "\n" .
                'Response: ' . substr($response, 0, 200) . '...'
            );
        } else if ($status === 'error') {
            $admin_email = get_option('admin_email');
            wp_mail($admin_email, 'OpenAI Processing Failed', 
                'Call ID: ' . $call_id . "\n" .
                'Error: ' . $error
            );
        }
    }
    
    return [
        'success' => true,
        'message' => 'Callback received',
        'callId' => $call_id
    ];
}

/**
 * Example usage functions
 */

/**
 * Generate yacht description
 */
function generate_yacht_description($yacht_id) {
    
    $processor = new Simple_OpenAI_Processor();
    
    // Get yacht data
    $yacht_data = get_post($yacht_id);
    $yacht_meta = get_post_meta($yacht_id);
    
    $instructions = 'You are a yacht charter expert. Generate compelling marketing descriptions for yacht listings. Be concise but engaging.';
    
    $data = [
        'yacht_name' => $yacht_data->post_title,
        'length' => $yacht_meta['yacht_length'][0] ?? 'Unknown',
        'capacity' => $yacht_meta['yacht_capacity'][0] ?? 'Unknown',
        'year' => $yacht_meta['yacht_year'][0] ?? 'Unknown',
        'location' => $yacht_meta['yacht_location'][0] ?? 'Unknown'
    ];
    
    $result = $processor->process(
        $instructions,
        $data,
        'https://yourwordpress.com/wp-json/dma/v1/openai-callback',
        'yacht_desc_' . $yacht_id,
        'gpt-4o-mini',
        ['temperature' => 0.8, 'max_tokens' => 500]
    );
    
    if ($result['success']) {
        // Store pending call for callback
        update_option('dma_pending_call_yacht_desc_' . $yacht_id, $yacht_id);
        
        return [
            'success' => true,
            'callId' => $result['callId'],
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
 * Process customer inquiry
 */
function process_customer_inquiry($inquiry_data) {
    
    $processor = new Simple_OpenAI_Processor();
    
    $instructions = 'You are a yacht charter customer service expert. Analyze customer inquiries and provide helpful responses.';
    
    $result = $processor->process(
        $instructions,
        $inquiry_data,
        'https://yourwordpress.com/wp-json/dma/v1/openai-callback',
        'inquiry_' . time(),
        'gpt-4o-mini',
        ['temperature' => 0.7, 'max_tokens' => 300]
    );
    
    return $result;
}

/**
 * Generate SEO content
 */
function generate_seo_content($content_data) {
    
    $processor = new Simple_OpenAI_Processor();
    
    $instructions = 'You are an SEO content expert. Generate optimized content for yacht charter websites.';
    
    $result = $processor->process(
        $instructions,
        $content_data,
        'https://yourwordpress.com/wp-json/dma/v1/openai-callback',
        'seo_' . time(),
        'gpt-4o-mini',
        ['temperature' => 0.6, 'max_tokens' => 800]
    );
    
    return $result;
}

/**
 * AJAX handler for checking status
 */
add_action('wp_ajax_check_openai_status', 'ajax_check_openai_status');
add_action('wp_ajax_nopriv_check_openai_status', 'ajax_check_openai_status');

function ajax_check_openai_status() {
    
    $call_id = sanitize_text_field($_POST['call_id']);
    $processor = new Simple_OpenAI_Processor();
    
    $status = $processor->check_status($call_id);
    
    wp_send_json($status);
}
