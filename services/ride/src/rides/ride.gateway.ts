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
 * clients (docs/api-design.md §3). Clients join a room per ride they participate
 * in. In production, a Redis socket.io adapter fans out across replicas.
 */
@Injectable()
@WebSocketGateway({ namespace: '/v1/ws/rides', cors: true })
export class RideGateway implements OnGatewayConnection {
  @WebSocketServer() private server!: Server;

  handleConnection(client: Socket): void {
    // The gateway trusts the API-gateway (Kong) JWT check at the edge; a full
    // in-process token verify is wired via the auth lib in a later hardening pass.
    const rideId = client.handshake.query.ride_id;
    if (typeof rideId === 'string') client.join(this.room(rideId));
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
}
