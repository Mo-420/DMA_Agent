<?php
/**
 * WordPress Integration Example for DMA Callback Service
 * 
 * This shows how to integrate WordPress with the Node.js callback service
 */

class DMA_Callback_Service {
    
    private $callback_base_url = 'http://78.46.232.79:3004/api/callback';
    
    /**
     * Send async request to Node.js service
     * 
     * @param string $callback_url WordPress endpoint to receive results
     * @param array $data Data to process
     * @param int $timeout Timeout in milliseconds
     * @return array Response with callback ID
     */
    public function send_async_request($callback_url, $data, $timeout = 30000) {
        
        $payload = [
            'callbackUrl' => $callback_url,
            'data' => $data,
            'timeout' => $timeout
        ];
        
        $response = wp_remote_post($this->callback_base_url . '/register', [
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
            'callbackId' => $result['callbackId'],
            'status' => $result['status']
        ];
    }
    
    /**
     * Check callback status
     */
    public function check_status($callback_id) {
        
        $response = wp_remote_get($this->callback_base_url . '/status/' . $callback_id);
        
        if (is_wp_error($response)) {
            return false;
        }
        
        $body = wp_remote_retrieve_body($response);
        return json_decode($body, true);
    }
    
    /**
     * Cancel a pending callback
     */
    public function cancel_callback($callback_id) {
        
        $response = wp_remote_request($this->callback_base_url . '/' . $callback_id, [
            'method' => 'DELETE'
        ]);
        
        return !is_wp_error($response);
    }
}

/**
 * WordPress REST API endpoint to receive callback results
 */
add_action('rest_api_init', function() {
    
    register_rest_route('dma/v1', '/callback-result', [
        'methods' => 'POST',
        'callback' => 'dma_handle_callback_result',
        'permission_callback' => '__return_true' // Add proper auth
    ]);
});

function dma_handle_callback_result($request) {
    
    $params = $request->get_json_params();
    
    // Log the callback result
    error_log('DMA Callback Result: ' . print_r($params, true));
    
    // Process the result based on callbackId
    $callback_id = $params['callbackId'] ?? '';
    $status = $params['status'] ?? 'unknown';
    $result = $params['result'] ?? null;
    
    // Example: Update post meta with result
    if ($callback_id && $result) {
        // Extract post ID from callback data if stored
        // update_post_meta($post_id, 'dma_result', $result);
    }
    
    return [
        'success' => true,
        'message' => 'Callback received',
        'callbackId' => $callback_id
    ];
}

/**
 * Example usage in WordPress
 */
function example_usage() {
    
    $callback_service = new DMA_Callback_Service();
    
    // Send async request
    $result = $callback_service->send_async_request(
        'https://yourwordpress.com/wp-json/dma/v1/callback-result',
        [
            'action' => 'process_yacht_data',
            'yacht_id' => 123,
            'user_id' => get_current_user_id()
        ],
        60000 // 60 second timeout
    );
    
    if ($result['success']) {
        echo "Request sent! Callback ID: " . $result['callbackId'];
        
        // Store callback ID for later reference
        update_user_meta(get_current_user_id(), 'pending_callback', $result['callbackId']);
    } else {
        echo "Error: " . $result['error'];
    }
}

/**
 * AJAX handler for checking callback status
 */
add_action('wp_ajax_check_callback_status', 'ajax_check_callback_status');
add_action('wp_ajax_nopriv_check_callback_status', 'ajax_check_callback_status');

function ajax_check_callback_status() {
    
    $callback_id = sanitize_text_field($_POST['callback_id']);
    $callback_service = new DMA_Callback_Service();
    
    $status = $callback_service->check_status($callback_id);
    
    wp_send_json($status);
}
