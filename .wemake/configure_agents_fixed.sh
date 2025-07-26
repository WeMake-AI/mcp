#!/bin/zsh

# List of files
files=("Code_Review.md" "Deployment.md" "Development.md" "Documentation.md" "Feature_Requests.md" "Feedback.md" "Orchestration.md" "PRD_Building.md" "Prompt_Template.md" "Roadmap_Planning.md" "Testing.md" "Troubleshooting.md")

dir="/Users/admin/Repositories/WeMake/mcp/.wemake/agents/"

# Multi-line content
cat << EOF > /tmp/new_content.txt

#### Resource Sharing
To share resources, use run_mcp with server_name "mcp.config.usrlocalmcp.AgentCollaboration", tool_name "share_resource", args {resourceId, resourceType, sharedWithId, permissions, metadata}. Example: Share a file with read permission.

#### Communication
For messaging, use "send_agent_message" with args {toAgentId, content, priority}. For events, "publish_event" with {eventType, eventData}.

#### Task Delegation
Delegate tasks using "delegate_task" with {taskId, title, description, assignedAgent, priority, metadata}. Agents can accept with "accept_delegation".
EOF

for file in "${files[@]}"; do
  fullpath="$dir$file"
  if [ -f "$fullpath" ]; then
    # Find line after '### Agent Collaboration'
    section_line=$(grep -n '^### Agent Collaboration' "$fullpath" | cut -d: -f1)
    if [ ! -z "$section_line" ]; then
      # Insert after the existing description line (assuming one line description follows)
      insert_line=$(($section_line + 2))  # Skip title and one description line
      sed -i '' "${insert_line}r /tmp/new_content.txt" "$fullpath"
    fi
    # Verify
    git diff "$fullpath" || echo "No changes in $file"
  fi
done

rm /tmp/new_content.txt
echo "Configurations added successfully."