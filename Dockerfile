# Use the latest official Fedora image as the base for our development environment.
FROM public.ecr.aws/docker/library/fedora:43

# Install essential development tools and dependencies using dnf (Fedora's package manager).
# - git, wget, tar, unzip: Core utilities for source control and file management.
# - gcc-c++, make: C/C++ compiler toolchain, sometimes needed for native extensions.
# - python3, python3-pip, python3-devel: Python environment for running the test suite.
RUN dnf update -y && \
    dnf install -y git wget tar jq unzip gcc-c++ make python3 python3-pip python3-devel && \
    dnf clean all


# Install Bun
# We use the official installer script.
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"


# --- Install Zig using the Bun script ---
# First, copy the custom installer script into the container.
# This assumes 'install-zig.js' is in the same directory as this Dockerfile.
COPY install-zig.js /tmp/install-zig.js

# Define the Zig version as a build argument for easy updates.
ARG ZIG_VERSION=0.14.0-dev.2837+f38d7a92c

# Run the script with the specified Zig version.
RUN bun run /tmp/install-zig.js ${ZIG_VERSION}

# Add the newly installed Zig to the PATH.
# The path is constructed from the version argument.
ENV PATH="/usr/local/zig-linux-x86_64-${ZIG_VERSION}:${PATH}"

# https://https://zigmirror.hryx.net/zig/zig-linux-x86_64-0.14.0-dev.2837+f38d7a92c.tar.xz?source=github-mlugg-setup-zig
# RUN wget https://ziglang.org/download/0.14.1/zig-x86_64-linux-0.14.1.tar.xz && \
#     tar -xf zig-x86_64-linux-0.14.1.tar.xz -C /usr/local/ && \
#     rm zig-x86_64-linux-0.14.1.tar.xz
# ENV PATH="/usr/local/zig-x86_64-linux-0.14.1:${PATH}"



# Set the working directory for the container.
WORKDIR /workspaces/statedb

# By default, run a shell to keep the container alive.
CMD ["/bin/bash"]
