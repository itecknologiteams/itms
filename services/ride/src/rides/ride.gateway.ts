import { Injectable } from '@nestjs/common';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Ride } from '../entities/ride.entity';
import { PointDto } from './dto';

/**
 * Pushes ride-state, driver-position, fare, and SOS frames to passenger/driver
 * clients (docs/api-design.md §3), plus dispatch offers to available drivers.
 * Clients join a room per ride they participate in (`ride_id` query param) or,
 * for a driver waiting for offers, their own room (`driver_id` query param —
 * this is the Auth user id, the same identity Ride/Dispatch use everywhere
 * else). In production, a Redis socket.io adapter fans out across replicas.
 */
@Injectable()
@WebSocketGateway({ namespace: '/v1/ws/rides', cors: true })
export class RideGateway implements OnGatewayConnection {
  @WebSocketServer() private server!: Server;

  handleConnection(client: Socket): void {
    // The gateway trusts the API-gateway (Kong) JWT check at the edge; a full
    // in-process token verify is wired via the auth lib in a later hardening
    // pass. A driver_id room join has the exact same trust model as the
    // existing ride_id join below — not a new weaker pattern.
    const rideId = client.handshake.query.ride_id;
    if (typeof rideId === 'string') client.join(this.room(rideId));
    const driverId = client.handshake.query.driver_id;
    if (typeof driverId === 'string') client.join(this.driverRoom(driverId));
  }

  /**
   * Relays Dispatch's per-round offer broadcast (services/dispatch/src's
   * MatchingService) to each candidate driver's room. Dispatch has no
   * gateway/client-facing surface of its own (internal.controller.ts's
   * /claim is network-locked, never routed through Kong) — this is the only
   * path from "a driver is being offered a ride" to an actual device.
   */
  emitOffer(driverIds: string[], payload: { ride_id: string; pickup: unknown; round: number }): void {
    for (const driverId of driverIds) {
      this.server?.to(this.driverRoom(driverId)).emit('ride.offer', payload);
    }
  }

  emitRideState(ride: Ride): void {
    this.emit(ride.id, 'ride.state', {
      ride_id: ride.id,
      status: ride.status,
      driver_id: ride.driverId,
      vehicle_id: ride.vehicleId,
    });
  }

  emitFare(ride: Ride): void {
    this.emit(ride.id, 'ride.fare', {
      ride_id: ride.id,
      total_paisa: ride.farePaisa,
      distance_m: ride.distanceM,
      duration_s: ride.durationS,
    });
  }

  emitSos(ride: Ride, pos: PointDto): void {
    this.emit(ride.id, 'ride.sos', { ride_id: ride.id, lat: pos.lat, lon: pos.lon });
  }

  private emit(rideId: string, event: string, payload: unknown): void {
    this.server?.to(this.room(rideId)).emit(event, payload);
  }

  private room(rideId: string): string {
    return `ride:${rideId}`;
  }

  private driverRoom(driverId: string): string {
    return `driver:${driverId}`;
  }
}
