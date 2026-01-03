def TOOL_NAME(tool_context: ToolContext, PARAM_NAME: PARAM_TYPE) -> Dict[str, str]:
    """
    TOOL_DESCRIPTION
    
    Args:
        PARAM_NAME: PARAM_DESCRIPTION
    
    Returns:
        Dictionary with status and message
    """
    # Implement tool logic here
    
    # Update state
    tool_context.state["KEY"] = PARAM_NAME
    
    return {
        "status": "success",
        "message": "TOOL_NAME executed successfully"
    }
