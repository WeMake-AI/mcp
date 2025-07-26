#!/bin/zsh

# List of files
files=("Code_Review.md" "Deployment.md" "Development.md" "Documentation.md" "Feature_Requests.md" "Feedback.md" "Orchestration.md" "PRD_Building.md" "Prompt_Template.md" "Roadmap_Planning.md" "Testing.md" "Troubleshooting.md")

dir="/Users/admin/Repositories/WeMake/mcp/.wemake/agents/"

new_content="\n#### Resource Sharing\nTo share resources, use run_mcp with server_name \"mcp.config.usrlocalmcp.AgentCollaboration\", tool_name \"share_resource\", args {resourceId, resourceType, sharedWithId, permissions, metadata}. Example: Share a file with read permission.\n\n#### Communication\nFor messaging, use \"send_agent_message\" with args {toAgentId, content, priority}. For events, \"publish_event\" with {eventType, eventData}.\n\n#### Task Delegation\nDelegate tasks using \"delegate_task\" with {taskId, title, description, assignedAgent, priority, metadata}. Agents can accept with \"accept_delegation\".\n"

for file in "${files[@]}"; do
  fullpath="$dir$file"
  if [ -f "$fullpath" ]; then
    # Find line after '### Agent Collaboration'
    section_line=$(grep -n '^### Agent Collaboration' "$fullpath" | cut -d: -f1)
    if [ ! -z "$section_line" ]; then
      # Insert new content after the description line (assuming description is next line)
      desc_line=$(($section_line + 1))
      sed -i '' "${desc_line}a\ $new_content" "$fullpath"
    fi
    # Verify
    git diff "$fullpath" || echo "No changes"
  fi
done

echo "Configurations added."