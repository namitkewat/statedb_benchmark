# StateDB vs. Redis Benchmark

This repository provides a simple and reproducible method for benchmarking the performance of [StateDB](https://github.com/namitkewat/statedb) against [Redis](https://redis.io/) on Ubuntu.

The benchmark uses the standard `redis-benchmark` tool to measure performance across a range of common commands.

---

## Prerequisites

Before you begin, ensure you have the following tools installed:
* `curl`
* `jq`
* `unzip`

You can install them with the following command:
```bash
sudo apt-get update && sudo apt-get install -y curl jq unzip
```

---

## Benchmarking Steps

### Step 1: Download StateDB and Install Redis

First, set up the two databases that will be benchmarked.

**1. Download the Latest StateDB Release**

A helper script `download_statedb.sh` is provided to automate this process. It will download and extract the latest Linux release into the current directory.

*(You should include the `download_statedb.sh` script from our previous conversation in your repository for this to work).*

```bash
# Make the script executable
chmod +x download_statedb.sh

# Run the script
./download_statedb.sh
```
This will create a `statedb-x86_64-linux` directory.

**2. Install Redis**

Install Redis and its command-line tools using `apt-get`.
```bash
sudo apt-get update && sudo apt-get install -y redis-server redis-tools
```

### Step 2: Start the Servers

You need to run both the StateDB and Redis servers simultaneously in separate terminal sessions or as background processes.

**1. Start the StateDB Server**

StateDB will run on its default port, **`6380`**.

```bash
# Make the statedb binary executable
chmod +x ./statedb-x86_64-linux/bin/statedb

# Run the server in the background
./statedb-x86_64-linux/bin/statedb &
```

**2. Start the Redis Server**

We will run Redis on a different port (**`7777`**) to avoid conflicts. The `--daemonize yes` flag runs it in the background.

```bash
redis-server --port 7777 --daemonize yes
```

### Step 3: Run the Benchmarks

Now that both servers are running, use `redis-benchmark` to test their performance and save the results to separate files.

**1. Benchmark StateDB**

Target port `6380` to benchmark StateDB and save the output to `statedb_result.txt`.

```bash
redis-benchmark -p 6380 -t PING,ECHO,CLIENT,DEL,EXISTS,FLUSHDB,TYPE,GET,SET,GETDEL,INCR,DECR,INCRBY,DECRBY,HSET,HGET,HGETALL > statedb_result.txt
```

**2. Benchmark Redis**

Target port `7777` to benchmark Redis and save the output to `redis_result.txt`.

```bash
redis-benchmark -p 7777 -t PING,ECHO,CLIENT,DEL,EXISTS,FLUSHDB,TYPE,GET,SET,GETDEL,INCR,DECR,INCRBY,DECRBY,HSET,HGET,HGETALL > redis_result.txt
```

### Step 4: Analyze the Results

You now have two files containing the performance reports:
* `statedb_result.txt`
* `redis_result.txt`

You can inspect these files to compare the requests-per-second and latency for each command on both database systems.
