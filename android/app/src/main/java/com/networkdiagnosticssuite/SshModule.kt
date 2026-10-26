package com.networkdiagnosticssuite

import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.jcraft.jsch.ChannelExec
import com.jcraft.jsch.JSch
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.security.MessageDigest
import java.util.Properties
import java.util.concurrent.Executors

class SshModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private val executor = Executors.newCachedThreadPool()
  override fun getName() = "SshClient"

  private fun sha256(bytes: ByteArray): String = "SHA256:" + Base64.encodeToString(MessageDigest.getInstance("SHA-256").digest(bytes), Base64.NO_WRAP).trimEnd('=')

  @ReactMethod
  fun probeHostKey(host: String, port: Int, promise: Promise) {
    executor.execute {
      var session: com.jcraft.jsch.Session? = null
      try {
        session = JSch().getSession("probe", host, port)
        session.setConfig(Properties().apply {
          put("StrictHostKeyChecking", "no")
          put("PreferredAuthentications", "none")
        })
        try { session.connect(7000) } catch (_: Exception) {
          // Authentication may fail after key exchange; the server key is still available.
        }
        val key = session.hostKey ?: throw IllegalStateException("El servidor no presentó una clave SSH")
        val keyBytes = Base64.decode(key.key, Base64.DEFAULT)
        promise.resolve(Arguments.createMap().apply {
          putString("algorithm", key.type)
          putString("fingerprint", sha256(keyBytes))
          putString("knownHost", "[$host]:$port ${key.type} ${key.key}")
        })
      } catch (error: Exception) { promise.reject("SSH_PROBE", error.message, error) } finally { session?.disconnect() }
    }
  }

  @ReactMethod
  fun execute(host: String, port: Int, username: String, password: String, knownHost: String, command: String, promise: Promise) {
    executor.execute {
      var session: com.jcraft.jsch.Session? = null
      var channel: ChannelExec? = null
      try {
        val jsch = JSch()
        jsch.setKnownHosts(ByteArrayInputStream((knownHost + "\n").toByteArray()))
        session = jsch.getSession(username, host, port).apply {
          setPassword(password)
          setConfig(Properties().apply {
            put("StrictHostKeyChecking", "yes")
            put("PreferredAuthentications", "password,keyboard-interactive")
          })
          connect(10000)
        }
        channel = session.openChannel("exec") as ChannelExec
        val output = ByteArrayOutputStream()
        val errors = ByteArrayOutputStream()
        channel.setCommand(command)
        channel.outputStream = output
        channel.setErrStream(errors)
        channel.connect(7000)
        val deadline = System.currentTimeMillis() + 15000
        while (!channel.isClosed && System.currentTimeMillis() < deadline) Thread.sleep(80)
        if (!channel.isClosed) throw IllegalStateException("El comando superó el tiempo máximo")
        promise.resolve(Arguments.createMap().apply {
          putInt("exitCode", channel.exitStatus)
          putString("stdout", output.toString("UTF-8"))
          putString("stderr", errors.toString("UTF-8"))
        })
      } catch (error: Exception) { promise.reject("SSH_EXEC", error.message, error) } finally { channel?.disconnect(); session?.disconnect() }
    }
  }
}
